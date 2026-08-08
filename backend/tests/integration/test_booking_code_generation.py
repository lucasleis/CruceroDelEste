"""Integration tests for app/services/booking_code.py's DB-dependent path.

generate_unique_booking_code() is the collision-handling mechanism chosen
for LLE-350: a SELECT before INSERT, not a SAVEPOINT-based retry (see the
module docstring in app/services/booking_code.py for the reasoning). These
tests force the collision case that mechanism is meant to catch.
"""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatusEnum
from app.models.trip import CountryEnum, Route, Stop, Trip, TripStatusEnum
from app.services.booking_code import BookingCodeExhaustedError, generate_unique_booking_code

_NOW = datetime.now(timezone.utc)


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
        departure_at=_NOW + timedelta(days=1),
        arrival_at=_NOW + timedelta(days=1, hours=4),
        status=TripStatusEnum.scheduled,
    )
    db.add(trip)
    await db.flush()
    return trip


async def _make_booking(db: AsyncSession, trip: Trip, booking_code: str) -> Booking:
    booking = Booking(
        trip_id=trip.id,
        booking_code=booking_code,
        status=BookingStatusEnum.pending_payment,
        contact_email="taken@example.com",
        total_amount=24500,
        expires_at=_NOW + timedelta(minutes=15),
    )
    db.add(booking)
    await db.flush()
    return booking


async def test_generate_unique_booking_code_happy_path_no_collision(db: AsyncSession):
    code = await generate_unique_booking_code(db)
    assert code.startswith("ERP-")
    assert len(code) == 13


async def test_generate_unique_booking_code_retries_past_a_real_collision(
    db: AsyncSession, monkeypatch
):
    trip = await _make_trip(db)
    taken_code = "ERP-7K3M-9QX2"
    await _make_booking(db, trip, taken_code)
    await db.commit()

    calls: list[str] = [taken_code, "ERP-ZZZZ-ZZZZ"]

    def _fake_generate() -> str:
        return calls.pop(0)

    # Patch the module-level function generate_unique_booking_code calls —
    # forces the exact collision the SELECT-before-INSERT check exists for:
    # the first candidate already exists as a real row in the table.
    monkeypatch.setattr(
        "app.services.booking_code.generate_booking_code", _fake_generate
    )

    code = await generate_unique_booking_code(db)

    assert code == "ERP-ZZZZ-ZZZZ"
    assert calls == []  # both candidates were consumed — it did retry, not skip


async def test_generate_unique_booking_code_all_attempts_exhausted_raises(
    db: AsyncSession, monkeypatch
):
    trip = await _make_trip(db)
    taken_code = "ERP-7K3M-9QX2"
    await _make_booking(db, trip, taken_code)
    await db.commit()

    # Every attempt returns the same already-taken code — must give up
    # deterministically rather than loop forever.
    monkeypatch.setattr(
        "app.services.booking_code.generate_booking_code", lambda: taken_code
    )

    with pytest.raises(BookingCodeExhaustedError):
        await generate_unique_booking_code(db)
