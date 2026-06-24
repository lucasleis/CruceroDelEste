"""Integration tests for app/routers/bookings.py."""

import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _make_stop(
    db: AsyncSession, name: str, country: CountryEnum
) -> Stop:
    stop = Stop(name=name, country=country)
    db.add(stop)
    await db.flush()
    return stop


async def _make_scheduled_trip(
    db: AsyncSession,
    *,
    departure_offset_days: int = 1,
    status: TripStatusEnum = TripStatusEnum.scheduled,
) -> Trip:
    origin_stop = await _make_stop(db, "Retiro", CountryEnum.AR)
    destination_stop = await _make_stop(db, "Asunción", CountryEnum.PY)
    route = Route(origin_stop_id=origin_stop.id, destination_stop_id=destination_stop.id)
    db.add(route)
    await db.flush()

    now = datetime.now(timezone.utc)
    trip = Trip(
        route_id=route.id,
        departure_at=now + timedelta(days=departure_offset_days),
        arrival_at=now + timedelta(days=departure_offset_days, hours=4),
        status=status,
    )
    db.add(trip)
    await db.flush()
    return trip


async def _make_seat(
    db: AsyncSession,
    trip: Trip,
    seat_number: str = "1A",
    *,
    seat_type: SeatTypeEnum = SeatTypeEnum.cama,
    status: SeatStatusEnum = SeatStatusEnum.available,
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


def _booking_payload(trip_id, seat_id, **passenger_overrides) -> dict:
    passenger = {
        "seat_id": str(seat_id),
        "first_name": "Ana",
        "last_name": "García",
        "dni": "12345678",
        "email": "ana@example.com",
        "phone": None,
        **passenger_overrides,
    }
    return {
        "trip_id": str(trip_id),
        "seat_ids": [str(seat_id)],
        "passengers": [passenger],
    }


async def _make_booking_in_db(db: AsyncSession) -> Booking:
    """Insert a complete booking row with one passenger directly via the session."""
    trip = await _make_scheduled_trip(db)
    seat = await _make_seat(db, trip, "1A", status=SeatStatusEnum.reserved)

    now = datetime.now(timezone.utc)
    booking = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.pending_payment,
        total_amount=24500,
        expires_at=now + timedelta(minutes=15),
    )
    db.add(booking)
    await db.flush()

    db.add(Passenger(
        booking_id=booking.id,
        seat_id=seat.id,
        first_name="Ana",
        last_name="García",
        dni="12345678",
        email="ana@example.com",
    ))
    await db.flush()
    return booking


# ---------------------------------------------------------------------------
# POST /bookings
# ---------------------------------------------------------------------------

async def test_post_bookings_happy_path_201(client: AsyncClient, db: AsyncSession):
    trip = await _make_scheduled_trip(db)
    seat = await _make_seat(db, trip)
    await _add_tranche(db, trip, SeatTypeEnum.cama, price=24500)

    resp = await client.post("/bookings", json=_booking_payload(trip.id, seat.id))

    assert resp.status_code == 201
    data = resp.json()

    assert data["trip_id"] == str(trip.id)
    assert data["status"] == "pending_payment"
    assert data["total_amount"] == 24500
    assert "id" in data
    assert "expires_at" in data
    assert "init_point" in data
    assert data["init_point"].startswith("https://")

    assert len(data["passengers"]) == 1
    pax = data["passengers"][0]
    assert pax["first_name"] == "Ana"
    assert pax["last_name"] == "García"
    assert pax["dni"] == "12345678"
    assert pax["email"] == "ana@example.com"
    assert pax["phone"] is None
    assert pax["seat_id"] == str(seat.id)
    assert "id" in pax


async def test_post_bookings_nonexistent_trip_returns_404(client: AsyncClient):
    fake_trip_id = uuid.uuid4()
    fake_seat_id = uuid.uuid4()

    resp = await client.post(
        "/bookings",
        json=_booking_payload(fake_trip_id, fake_seat_id),
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


async def test_post_bookings_cancelled_trip_returns_409(client: AsyncClient, db: AsyncSession):
    trip = await _make_scheduled_trip(db, status=TripStatusEnum.cancelled)
    seat = await _make_seat(db, trip)
    await _add_tranche(db, trip, SeatTypeEnum.cama)

    resp = await client.post("/bookings", json=_booking_payload(trip.id, seat.id))

    assert resp.status_code == 409
    assert resp.json()["detail"] == "trip_not_available"


async def test_post_bookings_past_trip_returns_409(client: AsyncClient, db: AsyncSession):
    now = datetime.now(timezone.utc)
    origin_stop = await _make_stop(db, "Retiro", CountryEnum.AR)
    destination_stop = await _make_stop(db, "Asunción", CountryEnum.PY)
    route = Route(origin_stop_id=origin_stop.id, destination_stop_id=destination_stop.id)
    db.add(route)
    await db.flush()

    past_trip = Trip(
        route_id=route.id,
        departure_at=now - timedelta(hours=2),
        arrival_at=now + timedelta(hours=2),
        status=TripStatusEnum.scheduled,
    )
    db.add(past_trip)
    await db.flush()

    seat = await _make_seat(db, past_trip)
    await _add_tranche(db, past_trip, SeatTypeEnum.cama)

    resp = await client.post("/bookings", json=_booking_payload(past_trip.id, seat.id))

    assert resp.status_code == 409
    assert resp.json()["detail"] == "trip_not_available"


async def test_post_bookings_reserved_seat_returns_409(client: AsyncClient, db: AsyncSession):
    trip = await _make_scheduled_trip(db)
    seat = await _make_seat(db, trip, status=SeatStatusEnum.reserved)
    await _add_tranche(db, trip, SeatTypeEnum.cama)

    resp = await client.post("/bookings", json=_booking_payload(trip.id, seat.id))

    assert resp.status_code == 409
    body = resp.json()
    assert body["detail"] == "seat_unavailable"
    assert body["seat_id"] == str(seat.id)


async def test_post_bookings_sold_seat_returns_409(client: AsyncClient, db: AsyncSession):
    trip = await _make_scheduled_trip(db)
    seat = await _make_seat(db, trip, status=SeatStatusEnum.sold)
    await _add_tranche(db, trip, SeatTypeEnum.cama)

    resp = await client.post("/bookings", json=_booking_payload(trip.id, seat.id))

    assert resp.status_code == 409
    body = resp.json()
    assert body["detail"] == "seat_unavailable"
    assert body["seat_id"] == str(seat.id)


async def test_post_bookings_seat_not_in_trip_returns_409(client: AsyncClient, db: AsyncSession):
    trip = await _make_scheduled_trip(db)
    # seat_id is a random UUID — not in DB, certainly not in this trip.
    fake_seat_id = uuid.uuid4()

    resp = await client.post("/bookings", json=_booking_payload(trip.id, fake_seat_id))

    assert resp.status_code == 409
    body = resp.json()
    assert body["detail"] == "seat_unavailable"
    assert body["seat_id"] == str(fake_seat_id)


async def test_post_bookings_no_price_tranche_returns_500(
    client: AsyncClient, db: AsyncSession
):
    trip = await _make_scheduled_trip(db)
    seat = await _make_seat(db, trip)
    # No price tranche → NoPriceTranche re-raised from router → 500.

    resp = await client.post("/bookings", json=_booking_payload(trip.id, seat.id))

    assert resp.status_code == 500


async def test_post_bookings_same_country_returns_422(client: AsyncClient, db: AsyncSession):
    origin_stop = await _make_stop(db, "Retiro", CountryEnum.AR)
    destination_stop = await _make_stop(db, "Liniers", CountryEnum.AR)
    route = Route(origin_stop_id=origin_stop.id, destination_stop_id=destination_stop.id)
    db.add(route)
    await db.flush()

    now = datetime.now(timezone.utc)
    trip = Trip(
        route_id=route.id,
        departure_at=now + timedelta(days=1),
        arrival_at=now + timedelta(days=1, hours=4),
        status=TripStatusEnum.scheduled,
    )
    db.add(trip)
    await db.flush()

    seat = await _make_seat(db, trip)
    await _add_tranche(db, trip, SeatTypeEnum.cama)

    resp = await client.post("/bookings", json=_booking_payload(trip.id, seat.id))

    assert resp.status_code == 422
    assert resp.json()["detail"] == "international_route_required"


async def test_post_bookings_py_ar_route_accepted(client: AsyncClient, db: AsyncSession):
    origin_stop = await _make_stop(db, "Asunción", CountryEnum.PY)
    destination_stop = await _make_stop(db, "Retiro", CountryEnum.AR)
    route = Route(origin_stop_id=origin_stop.id, destination_stop_id=destination_stop.id)
    db.add(route)
    await db.flush()

    now = datetime.now(timezone.utc)
    trip = Trip(
        route_id=route.id,
        departure_at=now + timedelta(days=1),
        arrival_at=now + timedelta(days=1, hours=17),
        status=TripStatusEnum.scheduled,
    )
    db.add(trip)
    await db.flush()

    seat = await _make_seat(db, trip)
    await _add_tranche(db, trip, SeatTypeEnum.cama, price=24500)

    resp = await client.post("/bookings", json=_booking_payload(trip.id, seat.id))

    assert resp.status_code == 201
    assert resp.json()["status"] == "pending_payment"


async def test_post_bookings_mp_failure_returns_502(
    client: AsyncClient, db: AsyncSession, mock_mp_sdk
):
    trip = await _make_scheduled_trip(db)
    seat = await _make_seat(db, trip)
    await _add_tranche(db, trip, SeatTypeEnum.cama)

    mock_mp_sdk.preference.return_value.create.return_value = {
        "status": 500,
        "response": {},
    }

    resp = await client.post("/bookings", json=_booking_payload(trip.id, seat.id))

    assert resp.status_code == 502
    assert resp.json()["detail"] == "payment_gateway_error"


# ---------------------------------------------------------------------------
# GET /bookings/{id}
# ---------------------------------------------------------------------------

async def test_get_booking_returns_200_with_correct_shape(
    client: AsyncClient, db: AsyncSession
):
    booking = await _make_booking_in_db(db)

    resp = await client.get(f"/bookings/{booking.id}")

    assert resp.status_code == 200
    data = resp.json()

    assert data["id"] == str(booking.id)
    assert data["trip_id"] == str(booking.trip_id)
    assert data["status"] == "pending_payment"
    assert data["total_amount"] == 24500
    assert "expires_at" in data
    assert data["confirmed_at"] is None

    assert len(data["passengers"]) == 1
    pax = data["passengers"][0]
    assert set(pax.keys()) == {"id", "seat_id", "first_name", "last_name", "dni", "email", "phone", "luggage_count"}
    assert pax["first_name"] == "Ana"
    assert pax["email"] == "ana@example.com"


async def test_get_booking_nonexistent_returns_404(client: AsyncClient):
    resp = await client.get(f"/bookings/{uuid.uuid4()}")

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"
