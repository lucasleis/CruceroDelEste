from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trip import PriceTranche, Seat, SeatStatusEnum, SeatTypeEnum


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
