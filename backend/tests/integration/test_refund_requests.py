"""Integration tests for POST /bookings/{id}/refund-request."""

import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingStatusEnum, Passenger, RefundRequest
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

async def _make_trip(db: AsyncSession, *, departure_hours_from_now: int = 72) -> Trip:
    origin_stop = Stop(name="Retiro", country=CountryEnum.AR)
    destination_stop = Stop(name="Asunción", country=CountryEnum.PY)
    db.add(origin_stop)
    db.add(destination_stop)
    await db.flush()
    route = Route(origin_stop_id=origin_stop.id, destination_stop_id=destination_stop.id)
    db.add(route)
    await db.flush()

    now = datetime.now(timezone.utc)
    trip = Trip(
        route_id=route.id,
        departure_at=now + timedelta(hours=departure_hours_from_now),
        arrival_at=now + timedelta(hours=departure_hours_from_now + 17),
        status=TripStatusEnum.scheduled,
    )
    db.add(trip)
    await db.flush()
    return trip


async def _make_confirmed_booking(
    db: AsyncSession,
    *,
    confirmed_days_ago: int = 0,
    departure_hours_from_now: int = 72,
    mp_payment_id: str = "123456789",
) -> tuple[Booking, Seat]:
    """Insert a confirmed booking with one passenger. Returns (booking, seat)."""
    trip = await _make_trip(db, departure_hours_from_now=departure_hours_from_now)
    seat = Seat(
        trip_id=trip.id,
        seat_number="1A",
        seat_type=SeatTypeEnum.cama,
        status=SeatStatusEnum.sold,
    )
    db.add(seat)
    await db.flush()

    now = datetime.now(timezone.utc)
    confirmed_at = now - timedelta(days=confirmed_days_ago)
    booking = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.confirmed,
        contact_email="buyer@example.com",
        total_amount=24500,
        expires_at=now + timedelta(minutes=15),
        confirmed_at=confirmed_at,
        mp_payment_id=mp_payment_id,
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
    return booking, seat


# ---------------------------------------------------------------------------
# POST /bookings/{id}/refund-request
# ---------------------------------------------------------------------------

async def test_refund_request_happy_path_201(client: AsyncClient, db: AsyncSession):
    booking, _ = await _make_confirmed_booking(db)

    resp = await client.post(
        f"/bookings/{booking.id}/refund-request",
        json={"email": "ana@example.com"},
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["booking_id"] == str(booking.id)
    assert data["window_valid"] is True
    assert data["email_used"] == "ana@example.com"
    assert "id" in data
    assert "requested_at" in data

    # Booking must be refunded in DB.
    booking_id = booking.id
    db.expire_all()
    refreshed = await db.get(Booking, booking_id)
    assert refreshed.status == BookingStatusEnum.refunded


async def test_refund_request_window_expired_10_days_422_persists_row(
    client: AsyncClient, db: AsyncSession
):
    """When the 10-day purchase window is expired, the row is persisted and its id is returned."""
    booking, _ = await _make_confirmed_booking(db, confirmed_days_ago=11)

    resp = await client.post(
        f"/bookings/{booking.id}/refund-request",
        json={"email": "ana@example.com"},
    )

    assert resp.status_code == 422
    data = resp.json()
    assert data["detail"] == "refund_window_expired"
    refund_request_id = data["refund_request_id"]
    assert refund_request_id  # must be a non-empty string (UUID)

    # Row must exist in DB with window_valid=False.
    booking_id = booking.id
    db.expire_all()
    result = await db.execute(
        select(RefundRequest).where(RefundRequest.booking_id == booking_id)
    )
    refund_req = result.scalar_one_or_none()
    assert refund_req is not None
    assert refund_req.window_valid is False
    assert str(refund_req.id) == refund_request_id

    # Booking must remain confirmed.
    refreshed = await db.get(Booking, booking_id)
    assert refreshed.status == BookingStatusEnum.confirmed


async def test_refund_request_window_expired_24h_before_departure_422_persists_row(
    client: AsyncClient, db: AsyncSession
):
    """Within 10-day purchase window but departure in <24hs → window_valid=False."""
    # Confirmed today (within 10-day window), but trip departs in 12 hours.
    booking, _ = await _make_confirmed_booking(
        db, confirmed_days_ago=0, departure_hours_from_now=12
    )

    resp = await client.post(
        f"/bookings/{booking.id}/refund-request",
        json={"email": "ana@example.com"},
    )

    assert resp.status_code == 422
    data = resp.json()
    assert data["detail"] == "refund_window_expired"
    refund_request_id = data["refund_request_id"]
    assert refund_request_id

    booking_id = booking.id
    db.expire_all()
    result = await db.execute(
        select(RefundRequest).where(RefundRequest.booking_id == booking_id)
    )
    refund_req = result.scalar_one_or_none()
    assert refund_req is not None
    assert refund_req.window_valid is False
    assert str(refund_req.id) == refund_request_id

    refreshed = await db.get(Booking, booking_id)
    assert refreshed.status == BookingStatusEnum.confirmed


async def test_refund_request_booking_not_found_404(client: AsyncClient):
    resp = await client.post(
        f"/bookings/{uuid.uuid4()}/refund-request",
        json={"email": "ana@example.com"},
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


async def test_refund_request_pending_booking_returns_409(
    client: AsyncClient, db: AsyncSession
):
    trip = await _make_trip(db)
    seat = Seat(
        trip_id=trip.id,
        seat_number="2B",
        seat_type=SeatTypeEnum.cama,
        status=SeatStatusEnum.reserved,
    )
    db.add(seat)
    await db.flush()

    now = datetime.now(timezone.utc)
    booking = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.pending_payment,
        contact_email="buyer@example.com",
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

    resp = await client.post(
        f"/bookings/{booking.id}/refund-request",
        json={"email": "ana@example.com"},
    )

    assert resp.status_code == 409
    assert resp.json()["detail"] == "booking_not_refundable"


async def test_refund_request_expired_booking_returns_409(
    client: AsyncClient, db: AsyncSession
):
    booking, _ = await _make_confirmed_booking(db)

    # Mutate to expired directly in DB.
    booking.status = BookingStatusEnum.expired
    await db.flush()

    resp = await client.post(
        f"/bookings/{booking.id}/refund-request",
        json={"email": "ana@example.com"},
    )

    assert resp.status_code == 409
    assert resp.json()["detail"] == "booking_not_refundable"


async def test_refund_request_already_refunded_returns_409(
    client: AsyncClient, db: AsyncSession
):
    booking, _ = await _make_confirmed_booking(db)
    booking.status = BookingStatusEnum.refunded
    await db.flush()

    resp = await client.post(
        f"/bookings/{booking.id}/refund-request",
        json={"email": "ana@example.com"},
    )

    assert resp.status_code == 409
    assert resp.json()["detail"] == "booking_not_refundable"


async def test_refund_request_wrong_email_returns_422(
    client: AsyncClient, db: AsyncSession
):
    booking, _ = await _make_confirmed_booking(db)

    resp = await client.post(
        f"/bookings/{booking.id}/refund-request",
        json={"email": "otro@example.com"},
    )

    assert resp.status_code == 422
    assert resp.json()["detail"] == "email_not_found"


async def test_refund_request_mp_failure_returns_502_booking_stays_confirmed(
    client: AsyncClient, db: AsyncSession, mock_mp_sdk
):
    booking, _ = await _make_confirmed_booking(db)

    mock_mp_sdk.payment.return_value.refunds.return_value = {
        "status": 500,
        "response": {},
    }

    resp = await client.post(
        f"/bookings/{booking.id}/refund-request",
        json={"email": "ana@example.com"},
    )

    assert resp.status_code == 502
    assert resp.json()["detail"] == "payment_gateway_error"

    # Booking must remain confirmed (MP call failed, nothing committed).
    booking_id = booking.id
    db.expire_all()
    refreshed = await db.get(Booking, booking_id)
    assert refreshed.status == BookingStatusEnum.confirmed

    # RefundRequest IS persisted (committed before the MP call).
    result = await db.execute(
        select(RefundRequest).where(RefundRequest.booking_id == booking.id)
    )
    refund_req = result.scalar_one_or_none()
    assert refund_req is not None
    assert refund_req.window_valid is True


async def test_refund_request_contact_email_accepted(
    client: AsyncClient, db: AsyncSession
):
    """Buyer (contact_email) can request a refund even when they are not a passenger."""
    booking, _ = await _make_confirmed_booking(db)
    # contact_email is "buyer@example.com"; passenger email is "ana@example.com".
    # Submitting with the buyer's email must succeed.

    resp = await client.post(
        f"/bookings/{booking.id}/refund-request",
        json={"email": "buyer@example.com"},
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["booking_id"] == str(booking.id)
    assert data["window_valid"] is True
    assert data["email_used"] == "buyer@example.com"

    booking_id = booking.id
    db.expire_all()
    refreshed = await db.get(Booking, booking_id)
    assert refreshed.status == BookingStatusEnum.refunded


async def test_refund_request_unrelated_email_returns_422(
    client: AsyncClient, db: AsyncSession
):
    """An email that is neither a passenger email nor the contact_email is rejected."""
    booking, _ = await _make_confirmed_booking(db)

    resp = await client.post(
        f"/bookings/{booking.id}/refund-request",
        json={"email": "stranger@example.com"},
    )

    assert resp.status_code == 422
    assert resp.json()["detail"] == "email_not_found"
