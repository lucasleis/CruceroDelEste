import logging
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_db, trip_load_options
from app.limiter import limiter
from app.errors import NotFoundError, PaymentProcessingError, RefundWindowExpiredError, SeatUnavailableError
from app.models.booking import Booking, BookingStatusEnum
from app.models.trip import Route, Trip, TripStatusEnum
from app.schemas.bookings import (
    BookingCreate,
    BookingCreateResponse,
    BookingRead,
    PassengerRead,
    RefundRequestCreate,
    RefundRequestRead,
)
from app.services.booking import (
    InternationalRouteRequiredError,
    PassengerData,
    create_booking,
    create_refund_request,
    expire_booking,
    mark_booking_refunded,
)
from app.services.inventory import SeatNotAvailable
from app.services.payment import create_preference, create_refund
from app.services.pricing import NoPriceTranche

_REFUND_WINDOW_DAYS = 10

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bookings", tags=["bookings"])



@router.post("", response_model=BookingCreateResponse, status_code=201)
async def create_booking_endpoint(
    booking_in: BookingCreate,
    db: AsyncSession = Depends(get_db),
) -> BookingCreateResponse:
    result = await db.execute(
        select(Trip)
        .options(trip_load_options())
        .where(Trip.id == booking_in.trip_id)
    )
    trip = result.scalar_one_or_none()
    if trip is None:
        raise NotFoundError()

    if (
        trip.status != TripStatusEnum.scheduled
        or trip.departure_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=409, detail="trip_not_available")

    passengers_data = [
        PassengerData(
            seat_id=p.seat_id,
            first_name=p.first_name,
            last_name=p.last_name,
            dni=p.dni,
            email=p.email,
            phone=p.phone,
        )
        for p in booking_in.passengers
    ]

    try:
        booking, items = await create_booking(
            db,
            booking_in.trip_id,
            booking_in.seat_ids,
            passengers_data,
            trip.route.origin_stop.country,
            trip.route.destination_stop.country,
            contact_email=booking_in.contact_email,
        )
    except InternationalRouteRequiredError:
        raise HTTPException(status_code=422, detail="international_route_required")
    except SeatNotAvailable as exc:
        raise SeatUnavailableError(str(exc.seat_id)) from exc
    except NoPriceTranche:
        logger.error(
            "no_price_tranche_on_booking trip_id=%s seat_ids=%s",
            booking_in.trip_id,
            booking_in.seat_ids,
        )
        raise

    await db.commit()

    payer_email = booking_in.contact_email

    try:
        preference = await create_preference(booking.id, items, payer_email)
    except PaymentProcessingError as exc:
        logger.error(
            "create_preference_failed booking_id=%s trip_id=%s status_code=%s",
            booking.id,
            booking_in.trip_id,
            exc.status_code,
        )
        try:
            await expire_booking(db, booking.id)
            await db.commit()
        except Exception:
            logger.error("cleanup_failed booking_id=%s", booking.id)
        raise HTTPException(status_code=502, detail="payment_gateway_error") from exc

    booking.mp_preference_id = preference.preference_id
    await db.commit()
    await db.refresh(booking, attribute_names=["passengers"])

    return BookingCreateResponse(
        id=booking.id,
        trip_id=booking.trip_id,
        status=booking.status,
        contact_email=booking.contact_email,
        total_amount=booking.total_amount,
        expires_at=booking.expires_at,
        passengers=[PassengerRead.model_validate(p) for p in booking.passengers],
        init_point=preference.init_point,
    )


@limiter.limit("5/minute")
@router.post("/{booking_id}/refund-request", response_model=RefundRequestRead, status_code=201)
async def create_refund_request_endpoint(
    request: Request,
    booking_id: UUID,
    body: RefundRequestCreate,
    db: AsyncSession = Depends(get_db),
) -> RefundRequestRead:
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.passengers), selectinload(Booking.trip))
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise NotFoundError()

    if booking.status != BookingStatusEnum.confirmed:
        raise HTTPException(status_code=409, detail="booking_not_refundable")

    # Accept the booking's contact_email (buyer) in addition to any passenger email.
    # The buyer may not be a passenger themselves but must be able to request a refund.
    valid_emails = {p.email.lower() for p in booking.passengers} | {booking.contact_email.lower()}
    if body.email.lower() not in valid_emails:
        raise HTTPException(status_code=422, detail="email_not_found")

    now = datetime.now(timezone.utc)
    # Resolución 424/2020: window is valid only when BOTH conditions hold:
    #   1. within 10 calendar days of purchase (confirmed_at)
    #   2. more than 24 hours before departure
    window_valid = (
        booking.confirmed_at is not None
        and now <= booking.confirmed_at + timedelta(days=_REFUND_WINDOW_DAYS)
        and now <= booking.trip.departure_at - timedelta(hours=24)
    )

    # Always persist — even when window_valid=False — so every request has a tracking id.
    refund_req = await create_refund_request(db, booking.id, body.email, window_valid)
    await db.commit()

    if not window_valid:
        raise RefundWindowExpiredError(refund_req.id)

    if not booking.mp_payment_id:
        logger.error("refund_no_mp_payment_id booking_id=%s", booking.id)
        raise HTTPException(status_code=500, detail="internal_server_error")

    try:
        await create_refund(booking.mp_payment_id)
    except PaymentProcessingError as exc:
        logger.error(
            "create_refund_failed booking_id=%s mp_payment_id=%s status_code=%s",
            booking.id,
            booking.mp_payment_id,
            exc.status_code,
        )
        raise HTTPException(status_code=502, detail="payment_gateway_error") from exc

    await mark_booking_refunded(db, booking.id)
    await db.commit()

    return RefundRequestRead.model_validate(refund_req)


@router.get("/{booking_id}", response_model=BookingRead)
async def get_booking(
    booking_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> BookingRead:
    result = await db.execute(
        select(Booking)
        .options(
            selectinload(Booking.trip)
            .selectinload(Trip.route)
            .options(
                selectinload(Route.origin_stop),
                selectinload(Route.destination_stop),
            ),
            selectinload(Booking.passengers),
        )
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise NotFoundError()
    return BookingRead.model_validate(booking)
