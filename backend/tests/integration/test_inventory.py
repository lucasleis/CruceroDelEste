"""Integration tests for app/services/inventory.py.

Uses the db fixture (AsyncSession) directly — no HTTP client.
Each test inserts its own data.
"""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import SeatAlreadyReleasedError
from app.models.trip import (
    CountryEnum,
    Route,
    Seat,
    SeatStatusEnum,
    SeatTypeEnum,
    Stop,
    Trip,
    TripStatusEnum,
)
from app.services.inventory import (
    SeatNotAvailable,
    mark_seats_sold,
    reserve_seats,
)

_NOW = datetime.now(timezone.utc)
_DEPARTURE = _NOW + timedelta(days=1)
_ARRIVAL = _NOW + timedelta(days=1, hours=4)


# ---------------------------------------------------------------------------
# Local helpers
# ---------------------------------------------------------------------------

async def _make_trip(db: AsyncSession) -> Trip:
    origin_stop = Stop(name="Retiro", country=CountryEnum.AR)
    destination_stop = Stop(name="Asunción", country=CountryEnum.PY)
    db.add(origin_stop)
    db.add(destination_stop)
    await db.flush()
    route = Route(origin_stop_id=origin_stop.id, destination_stop_id=destination_stop.id)
    db.add(route)
    await db.flush()
    trip = Trip(
        route_id=route.id,
        departure_at=_DEPARTURE,
        arrival_at=_ARRIVAL,
        status=TripStatusEnum.scheduled,
    )
    db.add(trip)
    await db.flush()
    return trip


async def _make_seat(
    db: AsyncSession,
    trip: Trip,
    seat_number: str,
    *,
    status: SeatStatusEnum = SeatStatusEnum.available,
    reserved_at: datetime | None = None,
) -> Seat:
    seat = Seat(
        trip_id=trip.id,
        seat_number=seat_number,
        seat_type=SeatTypeEnum.cama,
        status=status,
        reserved_at=reserved_at,
    )
    db.add(seat)
    await db.flush()
    return seat


async def _fetch_seat(db: AsyncSession, seat_id) -> Seat:
    result = await db.execute(select(Seat).where(Seat.id == seat_id))
    return result.scalar_one()


# ---------------------------------------------------------------------------
# reserve_seats — happy path
# ---------------------------------------------------------------------------

async def test_reserve_seats_transitions_to_reserved(db: AsyncSession):
    trip = await _make_trip(db)
    s1 = await _make_seat(db, trip, "1A")
    s2 = await _make_seat(db, trip, "1B")
    await db.commit()

    seats = await reserve_seats(db, [s1.id, s2.id], trip.id)

    assert len(seats) == 2
    for seat in seats:
        assert seat.status == SeatStatusEnum.reserved
        assert seat.reserved_at is not None


async def test_reserve_seats_reserved_at_is_recent(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "2A")
    await db.commit()

    before = datetime.now(timezone.utc)
    await reserve_seats(db, [seat.id], trip.id)
    after = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(seat)
    assert before <= seat.reserved_at <= after


# ---------------------------------------------------------------------------
# reserve_seats — error cases
# ---------------------------------------------------------------------------

async def test_reserve_already_reserved_seat_raises(db: AsyncSession):
    trip = await _make_trip(db)
    s1 = await _make_seat(db, trip, "3A")
    s2 = await _make_seat(
        db, trip, "3B",
        status=SeatStatusEnum.reserved,
        reserved_at=_NOW,
    )
    await db.commit()

    s1_id, s2_id = s1.id, s2.id  # capture before rollback detaches objects

    with pytest.raises(SeatNotAvailable) as exc_info:
        await reserve_seats(db, [s1_id, s2_id], trip.id)

    assert exc_info.value.seat_id in (s1_id, s2_id)

    # Rollback and confirm neither seat was permanently modified.
    await db.rollback()
    s1_db = await _fetch_seat(db, s1_id)
    assert s1_db.status == SeatStatusEnum.available


async def test_reserve_sold_seat_raises(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "4A", status=SeatStatusEnum.sold)
    await db.commit()

    with pytest.raises(SeatNotAvailable):
        await reserve_seats(db, [seat.id], trip.id)


async def test_reserve_seat_belonging_to_different_trip_raises(db: AsyncSession):
    trip_a = await _make_trip(db)
    # Use a different route (reversed) to avoid UNIQUE constraint on (origin_stop_id, destination_stop_id).
    origin_b = Stop(name="Encarnación", country=CountryEnum.PY)
    destination_b = Stop(name="Liniers", country=CountryEnum.AR)
    db.add(origin_b)
    db.add(destination_b)
    await db.flush()
    route_b = Route(origin_stop_id=origin_b.id, destination_stop_id=destination_b.id)
    db.add(route_b)
    await db.flush()
    trip_b = Trip(
        route_id=route_b.id,
        departure_at=_DEPARTURE,
        arrival_at=_ARRIVAL,
        status=TripStatusEnum.scheduled,
    )
    db.add(trip_b)
    await db.flush()
    seat_in_b = await _make_seat(db, trip_b, "5A")
    await db.commit()

    # seat_in_b exists but belongs to trip_b — reserve_seats queries with trip_a.id
    # so the seat is not found, triggering SeatNotAvailable.
    with pytest.raises(SeatNotAvailable):
        await reserve_seats(db, [seat_in_b.id], trip_a.id)


async def test_reserve_empty_list_returns_empty(db: AsyncSession):
    trip = await _make_trip(db)
    await db.commit()

    # Implementation: .in_([]) returns no rows → both loops are no-ops → returns [].
    seats = await reserve_seats(db, [], trip.id)

    assert seats == []


# ---------------------------------------------------------------------------
# mark_seats_sold
# ---------------------------------------------------------------------------

async def test_mark_reserved_seat_transitions_to_sold(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(
        db, trip, "10A",
        status=SeatStatusEnum.reserved,
        reserved_at=_NOW,
    )
    await db.commit()

    await mark_seats_sold(db, [seat.id])
    await db.commit()

    seat_db = await _fetch_seat(db, seat.id)
    assert seat_db.status == SeatStatusEnum.sold
    assert seat_db.reserved_at is None


async def test_mark_available_seat_raises_already_released(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "11A", status=SeatStatusEnum.available)
    await db.commit()

    with pytest.raises(SeatAlreadyReleasedError):
        await mark_seats_sold(db, [seat.id])


async def test_mark_already_sold_seat_raises_already_released(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "12A", status=SeatStatusEnum.sold)
    await db.commit()

    with pytest.raises(SeatAlreadyReleasedError):
        await mark_seats_sold(db, [seat.id])


async def test_mark_sold_multiple_seats(db: AsyncSession):
    trip = await _make_trip(db)
    s1 = await _make_seat(db, trip, "13A", status=SeatStatusEnum.reserved, reserved_at=_NOW)
    s2 = await _make_seat(db, trip, "13B", status=SeatStatusEnum.reserved, reserved_at=_NOW)
    await db.commit()

    await mark_seats_sold(db, [s1.id, s2.id])
    await db.commit()

    assert (await _fetch_seat(db, s1.id)).status == SeatStatusEnum.sold
    assert (await _fetch_seat(db, s2.id)).status == SeatStatusEnum.sold
