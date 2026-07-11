from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from passlib.context import CryptContext
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.deps import get_current_admin, get_db
from app.limiter import limiter
from app.errors import NotFoundError
from app.models.booking import (
    AdminUser,
    Booking,
    BookingStatusEnum,
    Chargeback,
    ChargebackStatusEnum,
    RefundRequest,
)
from app.models.trip import PriceTranche, SeatLayout, SeatTypeEnum, Trip
from app.schemas.admin import (
    AdminLoginRequest,
    AdminLoginResponse,
    PriceTrancheCreate,
    PriceTrancheRead,
    AdminBookingRead,
    ChargebackRead,
)
from app.schemas.bookings import RefundRequestRead

router = APIRouter(prefix="/admin", tags=["admin"])

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_DUMMY_HASH = _pwd_context.hash("dummy")


@router.post("/login", response_model=AdminLoginResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: AdminLoginRequest, db: AsyncSession = Depends(get_db)) -> AdminLoginResponse:
    result = await db.execute(select(AdminUser).where(AdminUser.email == body.email))
    admin = result.scalar_one_or_none()

    if admin is None:
        _pwd_context.verify(body.password, _DUMMY_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_credentials",
        )

    if not _pwd_context.verify(body.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_credentials",
        )

    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(admin.id),
        "exp": now + timedelta(minutes=settings.jwt_expiry_minutes),
        "iss": "crucero-admin",
        "aud": "crucero-admin-api",
    }
    token = jwt.encode(payload, settings.secret_key, algorithm="HS256")

    return AdminLoginResponse(access_token=token, token_type="bearer")


@router.get("/bookings", response_model=list[AdminBookingRead])
async def list_bookings(
    booking_status: BookingStatusEnum | None = None,
    trip_id: UUID | None = None,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminBookingRead]:
    query = (
        select(Booking)
        .options(selectinload(Booking.passengers))
        # MVP: sin paginación, límite defensivo de 500
        .limit(500)
        .order_by(Booking.created_at.desc())
    )
    if booking_status is not None:
        query = query.where(Booking.status == booking_status)
    if trip_id is not None:
        query = query.where(Booking.trip_id == trip_id)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/bookings/{booking_id}", response_model=AdminBookingRead)
async def get_booking(
    booking_id: UUID,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminBookingRead:
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.passengers))
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise NotFoundError(detail="booking_not_found")
    return booking


@router.get("/refund-requests", response_model=list[RefundRequestRead])
async def list_refund_requests(
    booking_id: UUID | None = None,
    window_valid: bool | None = None,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[RefundRequestRead]:
    query = (
        select(RefundRequest)
        # MVP: sin paginación, límite defensivo de 500
        .limit(500)
        .order_by(RefundRequest.requested_at.desc())
    )
    if booking_id is not None:
        query = query.where(RefundRequest.booking_id == booking_id)
    if window_valid is not None:
        query = query.where(RefundRequest.window_valid == window_valid)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/trips/{trip_id}/price-tranches", response_model=list[PriceTrancheRead])
async def list_price_tranches(
    trip_id: UUID,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[PriceTrancheRead]:
    trip = await db.get(Trip, trip_id)
    if trip is None:
        raise NotFoundError()

    result = await db.execute(
        select(PriceTranche)
        .where(PriceTranche.trip_id == trip_id)
        .order_by(PriceTranche.seat_type, PriceTranche.min_sold)
    )
    return list(result.scalars().all())


@router.post(
    "/trips/{trip_id}/price-tranches",
    response_model=PriceTrancheRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_price_tranche(
    trip_id: UUID,
    body: PriceTrancheCreate,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> PriceTrancheRead:
    result = await db.execute(
        select(Trip).options(selectinload(Trip.seat_layout)).where(Trip.id == trip_id)
    )
    trip = result.scalar_one_or_none()
    if trip is None:
        raise NotFoundError()

    if trip.seat_layout is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="trip_has_no_seat_layout",
        )

    await db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
        {"key": f"price_tranche_{trip_id}"},
    )

    result = await db.execute(
        select(PriceTranche)
        .where(
            PriceTranche.trip_id == trip_id,
            PriceTranche.seat_type == body.seat_type,
        )
        .with_for_update()
    )
    existing = list(result.scalars().all())

    if len(existing) >= 5:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="tranche_limit_exceeded",
        )

    seat_capacity = (
        trip.seat_layout.total_cama
        if body.seat_type == SeatTypeEnum.cama
        else trip.seat_layout.total_semi_cama
    )
    if body.max_sold > seat_capacity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="tranche_exceeds_seat_capacity",
        )

    for tranche in existing:
        if body.min_sold < tranche.max_sold and body.max_sold > tranche.min_sold:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="tranche_overlap",
            )

    new_tranche = PriceTranche(
        trip_id=trip_id,
        seat_type=body.seat_type,
        min_sold=body.min_sold,
        max_sold=body.max_sold,
        price=body.price,
    )

    all_tranches = existing + [new_tranche]
    sorted_tranches = sorted(all_tranches, key=lambda t: t.min_sold)
    if sorted_tranches[0].min_sold != 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="tranche_must_start_at_zero",
        )
    for i in range(1, len(sorted_tranches)):
        if sorted_tranches[i].min_sold > sorted_tranches[i - 1].max_sold + 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="tranche_gap",
            )

    db.add(new_tranche)
    await db.commit()
    await db.refresh(new_tranche)

    return new_tranche


@router.delete(
    "/trips/{trip_id}/price-tranches/{tranche_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_price_tranche(
    trip_id: UUID,
    tranche_id: UUID,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    trip = await db.get(Trip, trip_id)
    if trip is None:
        raise NotFoundError()

    tranche = await db.get(PriceTranche, tranche_id)
    if tranche is None or tranche.trip_id != trip_id:
        raise NotFoundError()

    await db.delete(tranche)
    await db.commit()


@router.get("/chargebacks", response_model=list[ChargebackRead])
async def list_chargebacks(
    status: ChargebackStatusEnum | None = None,
    booking_id: UUID | None = None,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[ChargebackRead]:
    query = (
        select(Chargeback)
        .limit(500)
        .order_by(Chargeback.created_at.desc())
    )
    if status is not None:
        query = query.where(Chargeback.status == status)
    if booking_id is not None:
        query = query.where(Chargeback.booking_id == booking_id)

    result = await db.execute(query)
    return list(result.scalars().all())
