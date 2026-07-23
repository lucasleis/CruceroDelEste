import functools
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from passlib.context import CryptContext
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.deps import get_current_admin, get_db
from app.limiter import limiter
from app.errors import (
    NotFoundError,
    TrancheExceedsSeatCapacityError,
    TrancheGapError,
    TrancheLimitExceededError,
    TrancheMustStartAtZeroError,
    TrancheOverlapError,
    TripHasNoSeatLayoutError,
)
from app.models.booking import (
    AdminUser,
    Booking,
    BookingStatusEnum,
    Chargeback,
    ChargebackStatusEnum,
    Passenger,
    RefundRequest,
)
from app.models.trip import PriceTranche, SeatTypeEnum, Trip
from app.services.pricing import add_price_tranche
from app.schemas.admin import (
    AdminLoginRequest,
    AdminLoginResponse,
    AdminMeResponse,
    PriceTrancheCreate,
    PriceTrancheRead,
    AdminBookingRead,
    AdminBookingListItem,
    PaginatedBookingsResponse,
    ChargebackRead,
)
from app.schemas.bookings import RefundRequestRead

router = APIRouter(prefix="/admin", tags=["admin"])

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@functools.lru_cache(maxsize=1)
def _get_dummy_hash() -> str:
    return _pwd_context.hash("dummy")


@router.post("/login", response_model=AdminLoginResponse)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    body: AdminLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> AdminLoginResponse:
    result = await db.execute(select(AdminUser).where(AdminUser.email == body.email))
    admin = result.scalar_one_or_none()

    if admin is None:
        _pwd_context.verify(body.password, _get_dummy_hash())
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

    response.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        secure=(settings.environment == "production"),
        samesite="strict",
        max_age=settings.jwt_expiry_minutes * 60,
    )

    return AdminLoginResponse(access_token=token, token_type="bearer")


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    response: Response,
    _admin: AdminUser = Depends(get_current_admin),
) -> dict:
    response.delete_cookie("admin_token")
    return {"ok": True}


@router.get("/me", response_model=AdminMeResponse)
async def me(_admin: AdminUser = Depends(get_current_admin)) -> AdminMeResponse:
    return AdminMeResponse(id=_admin.id, email=_admin.email)


@router.get("/bookings", response_model=PaginatedBookingsResponse)
async def list_bookings(
    booking_status: BookingStatusEnum | None = None,
    trip_id: UUID | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> PaginatedBookingsResponse:
    filters = []
    if booking_status is not None:
        filters.append(Booking.status == booking_status)
    if trip_id is not None:
        filters.append(Booking.trip_id == trip_id)

    passenger_count_subquery = (
        select(func.count(Passenger.id))
        .where(Passenger.booking_id == Booking.id)
        .correlate(Booking)
        .scalar_subquery()
    )

    query = (
        select(Booking, passenger_count_subquery.label("passenger_count"))
        .where(*filters)
        .order_by(Booking.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    items = [
        AdminBookingListItem.model_validate(
            {**booking.__dict__, "passenger_count": passenger_count}
        )
        for booking, passenger_count in result.all()
    ]

    count_query = select(func.count()).select_from(Booking).where(*filters)
    total = (await db.execute(count_query)).scalar_one()

    return PaginatedBookingsResponse(items=items, total=total)


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
    try:
        new_tranche = await add_price_tranche(
            db, trip_id, body.seat_type,
            body.min_sold, body.max_sold, body.price,
        )
    except NotFoundError:
        raise
    except TripHasNoSeatLayoutError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="trip_has_no_seat_layout")
    except TrancheLimitExceededError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="tranche_limit_exceeded")
    except TrancheExceedsSeatCapacityError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="tranche_exceeds_seat_capacity")
    except TrancheOverlapError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="tranche_overlap")
    except TrancheMustStartAtZeroError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="tranche_must_start_at_zero")
    except TrancheGapError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="tranche_gap")

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
