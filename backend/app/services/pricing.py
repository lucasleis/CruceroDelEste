from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.errors import (
    NotFoundError,
    TrancheExceedsSeatCapacityError,
    TrancheGapError,
    TrancheLimitExceededError,
    TrancheMustStartAtZeroError,
    TrancheOverlapError,
    TripHasNoSeatLayoutError,
)
from app.models.trip import PriceTranche, Seat, SeatStatusEnum, SeatTypeEnum, Trip


class NoPriceTranche(Exception):
    def __init__(self, trip_id: UUID, seat_type: SeatTypeEnum, sold_count: int) -> None:
        self.trip_id = trip_id
        self.seat_type = seat_type
        self.sold_count = sold_count
        super().__init__(
            f"No price tranche covers {sold_count} sold seats "
            f"for trip {trip_id} / {seat_type.value}"
        )


async def get_current_price(
    db: AsyncSession,
    trip_id: UUID,
    seat_type: SeatTypeEnum,
) -> int:
    sold_count = await _count_sold(db, trip_id, seat_type)
    price = await _resolve_tranche(db, trip_id, seat_type, sold_count)
    return price


async def _count_sold(
    db: AsyncSession,
    trip_id: UUID,
    seat_type: SeatTypeEnum,
) -> int:
    result = await db.execute(
        select(func.count(Seat.id)).where(
            Seat.trip_id == trip_id,
            Seat.seat_type == seat_type,
            Seat.status == SeatStatusEnum.sold,
        )
    )
    return result.scalar_one()


async def _resolve_tranche(
    db: AsyncSession,
    trip_id: UUID,
    seat_type: SeatTypeEnum,
    sold_count: int,
) -> int:
    result = await db.execute(
        select(PriceTranche).where(
            PriceTranche.trip_id == trip_id,
            PriceTranche.seat_type == seat_type,
            PriceTranche.min_sold <= sold_count,
            PriceTranche.max_sold > sold_count,
        )
    )
    tranche = result.scalar_one_or_none()
    if tranche is None:
        raise NoPriceTranche(trip_id, seat_type, sold_count)
    return tranche.price


async def add_price_tranche(
    db: AsyncSession,
    trip_id: UUID,
    seat_type: SeatTypeEnum,
    min_sold: int,
    max_sold: int,
    price: int,
) -> PriceTranche:
    result = await db.execute(
        select(Trip).options(selectinload(Trip.seat_layout)).where(Trip.id == trip_id)
    )
    trip = result.scalar_one_or_none()
    if trip is None:
        raise NotFoundError()

    if trip.seat_layout is None:
        raise TripHasNoSeatLayoutError()

    await db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:key))"),
        {"key": f"price_tranche_{trip_id}"},
    )

    result = await db.execute(
        select(PriceTranche)
        .where(
            PriceTranche.trip_id == trip_id,
            PriceTranche.seat_type == seat_type,
        )
        .with_for_update()
    )
    existing = list(result.scalars().all())

    if len(existing) >= 5:
        raise TrancheLimitExceededError()

    seat_capacity = (
        trip.seat_layout.total_cama
        if seat_type == SeatTypeEnum.cama
        else trip.seat_layout.total_semi_cama
    )
    if max_sold > seat_capacity:
        raise TrancheExceedsSeatCapacityError()

    for tranche in existing:
        if min_sold < tranche.max_sold and max_sold > tranche.min_sold:
            raise TrancheOverlapError()

    new_tranche = PriceTranche(
        trip_id=trip_id,
        seat_type=seat_type,
        min_sold=min_sold,
        max_sold=max_sold,
        price=price,
    )

    all_tranches = existing + [new_tranche]
    sorted_tranches = sorted(all_tranches, key=lambda t: t.min_sold)
    if sorted_tranches[0].min_sold != 0:
        raise TrancheMustStartAtZeroError()
    for i in range(1, len(sorted_tranches)):
        if sorted_tranches[i].min_sold > sorted_tranches[i - 1].max_sold + 1:
            raise TrancheGapError()

    db.add(new_tranche)
    return new_tranche
