# KNOWN GAP: seat type breakdown not validated — see CLAUDE.md

"""Integration tests for app/services/booking.py.

Uses the db fixture (AsyncSession) directly — no HTTP client.
Each test inserts its own data.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import SeatUnavailableError
from app.models.booking import Booking, BookingStatusEnum, Passenger
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
from app.services.booking import (
    BookingNotFound,
    InternationalRouteRequiredError,
    PassengerData,
    confirm_booking,
    create_booking,
    expire_booking,
)
from app.services.pricing import NoPriceTranche

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
    seat_type: SeatTypeEnum = SeatTypeEnum.cama,
) -> Seat:
    seat = Seat(
        trip_id=trip.id,
        seat_number=seat_number,
        seat_type=seat_type,
        status=status,
    )
    db.add(seat)
    await db.flush()
    return seat


async def _add_tranche(
    db: AsyncSession,
    trip: Trip,
    seat_type: SeatTypeEnum = SeatTypeEnum.cama,
    *,
    min_sold: int = 0,
    max_sold: int = 100,
    price: int = 24500,
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


def _passenger_data(seat: Seat) -> PassengerData:
    return PassengerData(
        seat_id=seat.id,
        first_name="Ana",
        last_name="García",
        dni="12345678",
        email="ana@example.com",
    )


# ---------------------------------------------------------------------------
# create_booking
# ---------------------------------------------------------------------------

async def test_create_booking_happy_path(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "1A")
    await _add_tranche(db, trip)
    await db.commit()

    booking, _ = await create_booking(
        db,
        trip_id=trip.id,
        seat_ids=[seat.id],
        passengers_data=[_passenger_data(seat)],
        origin_country=CountryEnum.AR,
        destination_country=CountryEnum.PY,
        contact_email="buyer@example.com",
    )
    await db.commit()

    assert booking.status == BookingStatusEnum.pending_payment
    assert booking.contact_email == "buyer@example.com"
    assert booking.total_amount == 24500
    assert booking.trip_id == trip.id
    assert booking.expires_at > _NOW

    # Seat must be reserved.
    result = await db.execute(select(Seat).where(Seat.id == seat.id))
    seat_db = result.scalar_one()
    assert seat_db.status == SeatStatusEnum.reserved

    # Passenger must exist.
    result = await db.execute(select(Passenger).where(Passenger.booking_id == booking.id))
    passengers = result.scalars().all()
    assert len(passengers) == 1
    assert passengers[0].seat_id == seat.id


async def test_create_booking_already_reserved_seat_raises(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "2A", status=SeatStatusEnum.reserved)
    await _add_tranche(db, trip)
    await db.commit()

    with pytest.raises(SeatUnavailableError):
        await create_booking(
            db,
            trip_id=trip.id,
            seat_ids=[seat.id],
            passengers_data=[_passenger_data(seat)],
            origin_country=CountryEnum.AR,
            destination_country=CountryEnum.PY,
            contact_email="buyer@example.com",
        )


async def test_create_booking_no_price_tranche_raises(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "3A")
    # No price tranches inserted.
    await db.commit()

    with pytest.raises(NoPriceTranche):
        await create_booking(
            db,
            trip_id=trip.id,
            seat_ids=[seat.id],
            passengers_data=[_passenger_data(seat)],
            origin_country=CountryEnum.AR,
            destination_country=CountryEnum.PY,
            contact_email="buyer@example.com",
        )


async def test_create_booking_nonexistent_trip_raises(db: AsyncSession):
    # Seats exist in a real trip but we pass a random trip_id.
    # _fetch_seats_for_pricing returns empty → _calculate_total returns 0.
    # reserve_seats finds no seats for the fake trip_id → SeatUnavailableError.
    fake_trip_id = uuid.uuid4()
    fake_seat_id = uuid.uuid4()
    fake_passenger = PassengerData(
        seat_id=fake_seat_id,
        first_name="X",
        last_name="Y",
        dni="00000000",
        email="x@example.com",
    )

    with pytest.raises(SeatUnavailableError):
        await create_booking(
            db,
            trip_id=fake_trip_id,
            seat_ids=[fake_seat_id],
            passengers_data=[fake_passenger],
            origin_country=CountryEnum.AR,
            destination_country=CountryEnum.PY,
            contact_email="buyer@example.com",
        )


async def test_create_booking_same_country_raises(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "9A")
    await _add_tranche(db, trip)
    await db.commit()

    with pytest.raises(InternationalRouteRequiredError):
        await create_booking(
            db,
            trip_id=trip.id,
            seat_ids=[seat.id],
            passengers_data=[_passenger_data(seat)],
            origin_country=CountryEnum.AR,
            destination_country=CountryEnum.AR,
            contact_email="buyer@example.com",
        )


# ---------------------------------------------------------------------------
# confirm_booking
# ---------------------------------------------------------------------------

async def test_confirm_booking_happy_path(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "4A", status=SeatStatusEnum.reserved)
    await _add_tranche(db, trip)

    booking = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.pending_payment,
        contact_email="buyer@example.com",
        total_amount=24500,
        expires_at=_NOW + timedelta(minutes=15),
    )
    db.add(booking)
    await db.flush()

    from app.models.booking import Passenger as PassengerModel
    db.add(PassengerModel(
        booking_id=booking.id,
        seat_id=seat.id,
        first_name="Ana",
        last_name="García",
        dni="12345678",
        email="ana@example.com",
    ))
    await db.commit()

    before = datetime.now(timezone.utc)
    confirmed = await confirm_booking(db, booking.id, mp_payment_id="mp-12345")
    await db.commit()
    after = datetime.now(timezone.utc)

    assert confirmed.status == BookingStatusEnum.confirmed
    assert confirmed.mp_payment_id == "mp-12345"
    assert before <= confirmed.confirmed_at <= after

    result = await db.execute(select(Seat).where(Seat.id == seat.id))
    assert result.scalar_one().status == SeatStatusEnum.sold


async def test_confirm_already_confirmed_booking_is_idempotent(db: AsyncSession):
    # confirm_booking has a status guard: if status != pending_payment it returns early
    # without modifying the booking (Bug 1.6 fix). A second call on an already-confirmed
    # booking must leave mp_payment_id and confirmed_at unchanged.
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "5A", status=SeatStatusEnum.sold)
    await _add_tranche(db, trip)

    original_confirmed_at = _NOW - timedelta(hours=1)
    booking = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.confirmed,
        contact_email="buyer@example.com",
        mp_payment_id="mp-old",
        total_amount=24500,
        expires_at=_NOW + timedelta(minutes=15),
        confirmed_at=original_confirmed_at,
    )
    db.add(booking)
    await db.flush()

    from app.models.booking import Passenger as PassengerModel
    db.add(PassengerModel(
        booking_id=booking.id,
        seat_id=seat.id,
        first_name="Ana",
        last_name="García",
        dni="12345678",
        email="ana@example.com",
    ))
    await db.commit()

    # Must not raise; booking returned unchanged (guard returns early).
    result = await confirm_booking(db, booking.id, mp_payment_id="mp-new")
    await db.commit()

    assert result.status == BookingStatusEnum.confirmed
    assert result.mp_payment_id == "mp-old"
    assert result.confirmed_at == original_confirmed_at


async def test_confirm_expired_booking_is_not_reactivated(db: AsyncSession):
    # confirm_booking has a status guard: if status != pending_payment it returns early.
    # An expired booking must remain expired — the guard prevents reactivation (Bug 1.6 fix).
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "6A", status=SeatStatusEnum.available)
    await _add_tranche(db, trip)

    booking = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.expired,
        contact_email="buyer@example.com",
        total_amount=24500,
        expires_at=_NOW - timedelta(hours=1),
    )
    db.add(booking)
    await db.flush()

    from app.models.booking import Passenger as PassengerModel
    db.add(PassengerModel(
        booking_id=booking.id,
        seat_id=seat.id,
        first_name="Ana",
        last_name="García",
        dni="12345678",
        email="ana@example.com",
    ))
    await db.commit()

    result = await confirm_booking(db, booking.id, mp_payment_id="mp-99")
    await db.commit()

    assert result.status == BookingStatusEnum.expired


# ---------------------------------------------------------------------------
# expire_booking
# ---------------------------------------------------------------------------

async def test_expire_booking_happy_path(db: AsyncSession):
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "7A", status=SeatStatusEnum.reserved)
    await _add_tranche(db, trip)

    booking = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.pending_payment,
        contact_email="buyer@example.com",
        total_amount=24500,
        expires_at=_NOW + timedelta(minutes=15),
    )
    db.add(booking)
    await db.flush()

    from app.models.booking import Passenger as PassengerModel
    db.add(PassengerModel(
        booking_id=booking.id,
        seat_id=seat.id,
        first_name="Ana",
        last_name="García",
        dni="12345678",
        email="ana@example.com",
    ))
    await db.commit()

    expired = await expire_booking(db, booking.id)
    await db.commit()

    assert expired.status == BookingStatusEnum.expired

    result = await db.execute(select(Seat).where(Seat.id == seat.id))
    seat_db = result.scalar_one()
    assert seat_db.status == SeatStatusEnum.available
    assert seat_db.reserved_at is None


async def test_expire_already_expired_booking_is_idempotent(db: AsyncSession):
    # expire_booking has no status guard — calling it again does not raise.
    trip = await _make_trip(db)
    seat = await _make_seat(db, trip, "8A", status=SeatStatusEnum.available)
    await _add_tranche(db, trip)

    booking = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.expired,
        contact_email="buyer@example.com",
        total_amount=24500,
        expires_at=_NOW - timedelta(hours=1),
    )
    db.add(booking)
    await db.flush()

    from app.models.booking import Passenger as PassengerModel
    db.add(PassengerModel(
        booking_id=booking.id,
        seat_id=seat.id,
        first_name="Ana",
        last_name="García",
        dni="12345678",
        email="ana@example.com",
    ))
    await db.commit()

    # Must not raise.
    result = await expire_booking(db, booking.id)
    await db.commit()

    assert result.status == BookingStatusEnum.expired
