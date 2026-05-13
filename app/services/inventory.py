from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.trip import Seat, SeatStatusEnum, SeatTypeEnum


async def get_available_seats(
    db: AsyncSession,
    trip_id: UUID,
    seat_type: SeatTypeEnum | None = None,
) -> list[Seat]:
    query = select(Seat).where(
        Seat.trip_id == trip_id,
        Seat.status == SeatStatusEnum.available,
    )
    if seat_type is not None:
        query = query.where(Seat.seat_type == seat_type)
    result = await db.execute(query)
    return list(result.scalars().all())


async def reserve_seats(
    db: AsyncSession,
    seat_ids: list[UUID],
    trip_id: UUID,
) -> list[Seat]:
    """
    Atomically mark seats as reserved. Raises SeatNotAvailable for any seat
    that is not in 'available' status or does not belong to the trip.
    Caller must commit the session.
    """
    result = await db.execute(
        select(Seat).where(
            Seat.id.in_(seat_ids),
            Seat.trip_id == trip_id,
        ).with_for_update()
    )
    seats = list(result.scalars().all())

    found_ids = {seat.id for seat in seats}
    for seat_id in seat_ids:
        if seat_id not in found_ids:
            raise SeatNotAvailable(seat_id)

    now = datetime.now(timezone.utc)
    expires_at = now.replace(
        second=now.second,
        microsecond=now.microsecond,
    )

    for seat in seats:
        if seat.status != SeatStatusEnum.available:
            raise SeatNotAvailable(seat.id)
        seat.status = SeatStatusEnum.reserved
        seat.reserved_at = now

    return seats


async def release_expired_reservations(db: AsyncSession) -> int:
    """
    Reset seats whose reservation has expired back to available.
    Returns the number of seats released.
    Caller must commit the session.
    """
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(
        minutes=settings.booking_expiry_minutes
    )

    result = await db.execute(
        select(Seat).where(
            Seat.status == SeatStatusEnum.reserved,
            Seat.reserved_at <= cutoff,
        ).with_for_update(skip_locked=True)
    )
    seats = list(result.scalars().all())

    for seat in seats:
        seat.status = SeatStatusEnum.available
        seat.reserved_at = None

    return len(seats)


async def mark_seats_sold(db: AsyncSession, seat_ids: list[UUID]) -> None:
    """
    Transition reserved seats to sold. Caller must commit the session.
    """
    result = await db.execute(
        select(Seat).where(Seat.id.in_(seat_ids)).with_for_update()
    )
    seats = list(result.scalars().all())

    for seat in seats:
        seat.status = SeatStatusEnum.sold
        seat.reserved_at = None


class SeatNotAvailable(Exception):
    def __init__(self, seat_id: UUID) -> None:
        self.seat_id = seat_id
        super().__init__(f"Seat {seat_id} is not available")
