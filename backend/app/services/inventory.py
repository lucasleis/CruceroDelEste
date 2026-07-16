from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import SeatAlreadyReleasedError
from app.models.trip import Seat, SeatStatusEnum, SeatTypeEnum


class SeatNotAvailable(Exception):
    def __init__(self, seat_id: UUID) -> None:
        self.seat_id = seat_id
        super().__init__(f"Seat {seat_id} is not available")


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
    try:
        result = await db.execute(
            select(Seat).where(
                Seat.id.in_(seat_ids),
                Seat.trip_id == trip_id,
            ).with_for_update(nowait=True)
        )
    except OperationalError as exc:
        if getattr(exc.orig, "pgcode", None) == "55P03":
            # Cannot determine which seat caused the lock contention (Postgres 55P03
            # does not expose the blocking row). Reporting seat_ids[0] as a placeholder.
            raise SeatNotAvailable(seat_ids[0])
        raise
    seats = list(result.scalars().all())

    found_ids = {seat.id for seat in seats}
    for seat_id in seat_ids:
        if seat_id not in found_ids:
            raise SeatNotAvailable(seat_id)

    now = datetime.now(timezone.utc)

    for seat in seats:
        if seat.status != SeatStatusEnum.available:
            raise SeatNotAvailable(seat.id)
        seat.status = SeatStatusEnum.reserved
        seat.reserved_at = now

    return seats


async def mark_seats_sold(db: AsyncSession, seat_ids: list[UUID]) -> None:
    """
    Transition reserved seats to sold. Caller must commit the session.
    """
    result = await db.execute(
        select(Seat).where(Seat.id.in_(seat_ids)).with_for_update()
    )
    seats = list(result.scalars().all())

    for seat in seats:
        if seat.status != SeatStatusEnum.reserved:
            raise SeatAlreadyReleasedError(seat.id)
        seat.status = SeatStatusEnum.sold
        seat.reserved_at = None
