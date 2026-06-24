"""Integration tests for app/services/pricing.py.

Uses a real Postgres session — no HTTP client, no mocks of SQLAlchemy.
Each test inserts its own fixtures via the db session.
"""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking
from app.models.trip import (
    CountryEnum,
    PriceTranche,
    Route,
    Seat,
    SeatStatusEnum,
    SeatTypeEnum,
    Stop,
    Trip,
    TripStatusEnum,
)
from app.services.pricing import NoPriceTranche, get_current_price

_NOW = datetime.now(timezone.utc)
_DEPARTURE = _NOW + timedelta(days=1)
_ARRIVAL = _NOW + timedelta(days=1, hours=4)


# ---------------------------------------------------------------------------
# Local factory helpers (not shared across files)
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


async def _add_tranche(
    db: AsyncSession,
    trip: Trip,
    seat_type: SeatTypeEnum,
    min_sold: int,
    max_sold: int,
    price: int,
) -> PriceTranche:
    tranche = PriceTranche(
        trip_id=trip.id,
        seat_type=seat_type,
        min_sold=min_sold,
        max_sold=max_sold,
        price=price,
    )
    db.add(tranche)
    await db.flush()
    return tranche


async def _add_sold_seats(
    db: AsyncSession,
    trip: Trip,
    seat_type: SeatTypeEnum,
    count: int,
    start_number: int = 1,
) -> list[Seat]:
    seats = []
    for i in range(count):
        seat = Seat(
            trip_id=trip.id,
            seat_number=str(start_number + i),
            seat_type=seat_type,
            status=SeatStatusEnum.sold,
        )
        db.add(seat)
        seats.append(seat)
    await db.flush()
    return seats


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

async def test_no_tranches_raises_no_price_tranche(db: AsyncSession):
    trip = await _make_trip(db)
    await db.commit()

    with pytest.raises(NoPriceTranche) as exc_info:
        await get_current_price(db, trip.id, SeatTypeEnum.cama)

    assert exc_info.value.trip_id == trip.id
    assert exc_info.value.seat_type == SeatTypeEnum.cama
    assert exc_info.value.sold_count == 0


async def test_one_tranche_zero_sold_returns_price(db: AsyncSession):
    trip = await _make_trip(db)
    await _add_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=10, price=24500)
    await db.commit()

    price = await get_current_price(db, trip.id, SeatTypeEnum.cama)

    assert price == 24500


async def test_multiple_tranches_returns_matching_tranche(db: AsyncSession):
    trip = await _make_trip(db)
    await _add_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=5, price=24500)
    await _add_tranche(db, trip, SeatTypeEnum.cama, min_sold=5, max_sold=10, price=26000)
    # 5 seats sold → sold_count=5 → second tranche [5, 10)
    await _add_sold_seats(db, trip, SeatTypeEnum.cama, count=5)
    await db.commit()

    price = await get_current_price(db, trip.id, SeatTypeEnum.cama)

    assert price == 26000


async def test_sold_count_above_all_tranches_raises(db: AsyncSession):
    trip = await _make_trip(db)
    # Tranche covers [0, 5) — 5 sold seats puts count exactly at max_sold → no match.
    await _add_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=5, price=24500)
    await _add_sold_seats(db, trip, SeatTypeEnum.cama, count=5)
    await db.commit()

    with pytest.raises(NoPriceTranche) as exc_info:
        await get_current_price(db, trip.id, SeatTypeEnum.cama)

    assert exc_info.value.sold_count == 5


async def test_boundary_sold_count_at_min_sold_matches_tranche(db: AsyncSession):
    # Tranche [3, 10): sold_count=3 must match (min_sold is inclusive).
    trip = await _make_trip(db)
    await _add_tranche(db, trip, SeatTypeEnum.cama, min_sold=3, max_sold=10, price=27000)
    await _add_sold_seats(db, trip, SeatTypeEnum.cama, count=3)
    await db.commit()

    price = await get_current_price(db, trip.id, SeatTypeEnum.cama)

    assert price == 27000


async def test_boundary_sold_count_at_max_sold_minus_one_matches_tranche(db: AsyncSession):
    # Tranche [0, 5): sold_count=4 (max_sold-1) must still match.
    trip = await _make_trip(db)
    await _add_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=5, price=24500)
    await _add_sold_seats(db, trip, SeatTypeEnum.cama, count=4)
    await db.commit()

    price = await get_current_price(db, trip.id, SeatTypeEnum.cama)

    assert price == 24500


async def test_seat_type_isolation(db: AsyncSession):
    # A cama tranche must not affect semi_cama pricing and vice versa.
    trip = await _make_trip(db)
    await _add_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=10, price=24500)
    await _add_tranche(db, trip, SeatTypeEnum.semi_cama, min_sold=0, max_sold=10, price=23300)
    await db.commit()

    cama_price = await get_current_price(db, trip.id, SeatTypeEnum.cama)
    semi_price = await get_current_price(db, trip.id, SeatTypeEnum.semi_cama)

    assert cama_price == 24500
    assert semi_price == 23300


async def test_sold_seats_of_other_type_not_counted(db: AsyncSession):
    # Sold semi_cama seats must not increment the cama sold_count.
    trip = await _make_trip(db)
    await _add_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=5, price=24500)
    await _add_tranche(db, trip, SeatTypeEnum.cama, min_sold=5, max_sold=10, price=26000)
    # Sell 5 semi_cama seats — cama sold_count stays at 0.
    await _add_sold_seats(db, trip, SeatTypeEnum.semi_cama, count=5, start_number=100)
    await db.commit()

    price = await get_current_price(db, trip.id, SeatTypeEnum.cama)

    # sold_count for cama is 0 → first tranche [0, 5) → 24500
    assert price == 24500


async def test_semi_cama_no_tranche_raises(db: AsyncSession):
    # Cama tranche exists but semi_cama has none → NoPriceTranche for semi_cama.
    trip = await _make_trip(db)
    await _add_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=10, price=24500)
    await db.commit()

    with pytest.raises(NoPriceTranche) as exc_info:
        await get_current_price(db, trip.id, SeatTypeEnum.semi_cama)

    assert exc_info.value.seat_type == SeatTypeEnum.semi_cama
