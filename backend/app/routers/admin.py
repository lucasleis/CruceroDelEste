from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.deps import get_current_admin, get_db
from app.errors import NotFoundError
from app.models.booking import AdminUser, Booking, BookingStatusEnum
from app.models.trip import PriceTranche, Trip
from app.schemas.admin import (
    AdminLoginRequest,
    AdminLoginResponse,
    PriceTrancheCreate,
    PriceTrancheRead,
    AdminBookingRead,
)

router = APIRouter(prefix="/admin", tags=["admin"])

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/login", response_model=AdminLoginResponse)
async def login(body: AdminLoginRequest, db: AsyncSession = Depends(get_db)) -> AdminLoginResponse:
    result = await db.execute(select(AdminUser).where(AdminUser.email == body.email))
    admin = result.scalar_one_or_none()

    if admin is None or not _pwd_context.verify(body.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_credentials",
        )

    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(admin.id),
        "exp": now + timedelta(minutes=settings.jwt_expiry_minutes),
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
    trip = await db.get(Trip, trip_id)
    if trip is None:
        raise NotFoundError()

    result = await db.execute(
        select(PriceTranche).where(
            PriceTranche.trip_id == trip_id,
            PriceTranche.seat_type == body.seat_type,
        )
    )
    existing = list(result.scalars().all())

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
