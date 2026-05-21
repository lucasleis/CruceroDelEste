"""Integration tests for app/services/inventory.py.

Uses the db fixture (AsyncSession) directly — no HTTP client.
Each test inserts its own data.
"""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trip import (
    Route,
    Seat,
    SeatStatusEnum,
    SeatTypeEnum,
    Trip,
    TripStatusEnum,
)
from app.services.inventory import (
    SeatNotAvailable,
    mark_seats_sold,
    release_expired_reservations,
    reserve_seats,
)

_NOW = datetime.now(timezone.utc)
_DEPARTURE = _NOW + timedelta(days=1)
_ARRIVAL = _NOW + timedelta(days=1, hours=4)


# ---------------------------------------------------------------------------
# Local helpers
# ---------------------------------------------------------------------------

async def _make_trip(db: AsyncSession) -> Trip:
    route = Route(origin="Buenos Aires", destination="Rosario")
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

    with pytest.raises(SeatNotAvailable) as exc_info:
        await reserve_seats(db, [s1.id, s2.id], trip.id)

    assert exc_info.value.seat_id in (s1.id, s2.id)

    # Rollback and confirm neither seat was permanently modified.
    await db.rollback()
    s1_db = await _fetch_seat(db, s1.id)
    assert s1_db.status == SeatStatusEnum.available


async def test_reserve_sold_seat_raises(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "4A", status=SeatStatusEnum.sold)
    await db.commit()

    with pytest.raises(SeatNotAvailable):
        await reserve_seats(db, [seat.id], trip.id)


async def test_reserve_seat_belonging_to_different_trip_raises(db: AsyncSession):
    trip_a = await _make_trip(db)
    trip_b = await _make_trip(db)
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
# release_expired_reservations
# ---------------------------------------------------------------------------

async def test_release_expired_seat_transitions_to_available(db: AsyncSession):
    trip = await _make_trip(db)
    # reserved_at 20 minutes ago — beyond the 15-minute booking_expiry_minutes threshold.
    expired_at = _NOW - timedelta(minutes=20)
    seat = await _make_seat(
        db, trip, "6A",
        status=SeatStatusEnum.reserved,
        reserved_at=expired_at,
    )
    await db.commit()

    released = await release_expired_reservations(db)
    await db.commit()

    assert released == 1
    seat_db = await _fetch_seat(db, seat.id)
    assert seat_db.status == SeatStatusEnum.available
    assert seat_db.reserved_at is None


async def test_release_does_not_touch_fresh_reservation(db: AsyncSession):
    trip = await _make_trip(db)
    # reserved_at 5 minutes ago — within the 15-minute threshold.
    fresh_at = _NOW - timedelta(minutes=5)
    seat = await _make_seat(
        db, trip, "7A",
        status=SeatStatusEnum.reserved,
        reserved_at=fresh_at,
    )
    await db.commit()

    released = await release_expired_reservations(db)
    await db.commit()

    assert released == 0
    seat_db = await _fetch_seat(db, seat.id)
    assert seat_db.status == SeatStatusEnum.reserved


async def test_release_only_expired_among_mixed_reservations(db: AsyncSession):
    trip = await _make_trip(db)
    expired_at = _NOW - timedelta(minutes=20)
    fresh_at = _NOW - timedelta(minutes=5)

    stale = await _make_seat(
        db, trip, "8A",
        status=SeatStatusEnum.reserved,
        reserved_at=expired_at,
    )
    fresh = await _make_seat(
        db, trip, "8B",
        status=SeatStatusEnum.reserved,
        reserved_at=fresh_at,
    )
    await db.commit()

    released = await release_expired_reservations(db)
    await db.commit()

    assert released == 1
    assert (await _fetch_seat(db, stale.id)).status == SeatStatusEnum.available
    assert (await _fetch_seat(db, fresh.id)).status == SeatStatusEnum.reserved


async def test_release_with_no_expired_seats_returns_zero(db: AsyncSession):
    trip = await _make_trip(db)
    await _make_seat(db, trip, "9A", status=SeatStatusEnum.available)
    await db.commit()

    released = await release_expired_reservations(db)

    assert released == 0


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


async def test_mark_available_seat_silently_becomes_sold(db: AsyncSession):
    # mark_seats_sold has no status check — it unconditionally sets sold.
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "11A", status=SeatStatusEnum.available)
    await db.commit()

    await mark_seats_sold(db, [seat.id])
    await db.commit()

    seat_db = await _fetch_seat(db, seat.id)
    assert seat_db.status == SeatStatusEnum.sold


async def test_mark_already_sold_seat_stays_sold(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "12A", status=SeatStatusEnum.sold)
    await db.commit()

    await mark_seats_sold(db, [seat.id])
    await db.commit()

    seat_db = await _fetch_seat(db, seat.id)
    assert seat_db.status == SeatStatusEnum.sold


async def test_mark_sold_multiple_seats(db: AsyncSession):
    trip = await _make_trip(db)
    s1 = await _make_seat(db, trip, "13A", status=SeatStatusEnum.reserved, reserved_at=_NOW)
    s2 = await _make_seat(db, trip, "13B", status=SeatStatusEnum.reserved, reserved_at=_NOW)
    await db.commit()

    await mark_seats_sold(db, [s1.id, s2.id])
    await db.commit()

    assert (await _fetch_seat(db, s1.id)).status == SeatStatusEnum.sold
    assert (await _fetch_seat(db, s2.id)).status == SeatStatusEnum.sold
