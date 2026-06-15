"""Integration tests for app/routers/payments.py.

Webhook URL: POST /webhooks/mercadopago?data.id=<payment_id>

Key facts verified against the router source:
- `data.id` comes from the QUERY STRING, not the JSON body.
- `body["data"]["id"]` is the payment_id forwarded to get_payment().
- The mock default has external_reference=None which triggers PaymentProcessingError
  (get_payment rejects non-UUID external_reference). Tests that exercise the
  post-signature path MUST override mock_mp_sdk.payment.return_value.get.return_value.
- Idempotency guard (step 10): if booking.status == confirmed, returns {"status":"ok"}
  immediately without calling confirm_booking again.
"""

import hashlib
import hmac
import time
import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.booking import Booking, BookingStatusEnum, Passenger
from app.models.trip import Route, Seat, SeatStatusEnum, SeatTypeEnum, Trip, TripStatusEnum


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_valid_signature(data_id: str, request_id: str | None = None) -> str:
    """Compute the x-signature header value for a given data_id."""
    ts = int(time.time())
    manifest_parts = [f"id:{data_id.lower()}"]
    if request_id:
        manifest_parts.append(f"request-id:{request_id}")
    manifest_parts.append(f"ts:{ts}")
    manifest = ";".join(manifest_parts) + ";"
    digest = hmac.new(
        settings.mercadopago_webhook_secret.encode(),
        manifest.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"ts={ts},v1={digest}"


async def _post_webhook(
    client: AsyncClient,
    *,
    data_id: str,
    x_signature: str,
    body: dict,
    request_id: str | None = None,
):
    headers = {"x-signature": x_signature}
    if request_id:
        headers["x-request-id"] = request_id
    return await client.post(
        "/webhooks/mercadopago",
        params={"data.id": data_id},
        headers=headers,
        json=body,
    )


async def _make_pending_booking(db: AsyncSession) -> Booking:
    """Insert a Route → Trip → Seat → Booking → Passenger chain."""
    route = Route(origin="Buenos Aires", destination="Rosario")
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

    seat = Seat(
        trip_id=trip.id,
        seat_number="1A",
        seat_type=SeatTypeEnum.cama,
        status=SeatStatusEnum.reserved,
    )
    db.add(seat)
    await db.flush()

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


def _approved_payment_response(external_reference: str, payment_id: int = 123456789) -> dict:
    return {
        "status": 200,
        "response": {
            "id": payment_id,
            "status": "approved",
            "external_reference": external_reference,
            "transaction_amount": 24500.0,
        },
    }


# ---------------------------------------------------------------------------
# Mandatory case 1 — invalid signature
# ---------------------------------------------------------------------------

async def test_webhook_invalid_signature_returns_ignored(client: AsyncClient):
    resp = await _post_webhook(
        client,
        data_id="999",
        x_signature="ts=0,v1=invalidsignature",
        body={"data": {"id": "999"}},
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ignored", "reason": "invalid_signature"}


async def test_webhook_missing_x_signature_returns_ignored(client: AsyncClient):
    resp = await client.post(
        "/webhooks/mercadopago",
        params={"data.id": "999"},
        json={"data": {"id": "999"}},
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ignored", "reason": "invalid_signature"}


# ---------------------------------------------------------------------------
# Missing / malformed payload cases
# ---------------------------------------------------------------------------

async def test_webhook_missing_data_id_query_param_returns_malformed(client: AsyncClient):
    # No data.id query param at all.
    resp = await client.post(
        "/webhooks/mercadopago",
        headers={"x-signature": "ts=1,v1=abc"},
        json={"data": {"id": "999"}},
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ignored", "reason": "malformed_payload"}


async def test_webhook_malformed_body_returns_malformed(client: AsyncClient):
    data_id = "123"
    x_sig = _make_valid_signature(data_id)

    # Body does not contain the expected data.id structure.
    resp = await _post_webhook(
        client,
        data_id=data_id,
        x_signature=x_sig,
        body={"unexpected": "structure"},
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ignored", "reason": "malformed_payload"}


# ---------------------------------------------------------------------------
# Mandatory case 2 — booking not found
# ---------------------------------------------------------------------------

async def test_webhook_booking_not_found_returns_ignored(
    client: AsyncClient, mock_mp_sdk
):
    data_id = "555"
    unknown_uuid = str(uuid.uuid4())  # valid UUID, not in DB

    mock_mp_sdk.payment.return_value.get.return_value = _approved_payment_response(
        external_reference=unknown_uuid,
    )

    x_sig = _make_valid_signature(data_id)
    resp = await _post_webhook(
        client,
        data_id=data_id,
        x_signature=x_sig,
        body={"data": {"id": data_id}},
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ignored", "reason": "booking_not_found"}


# ---------------------------------------------------------------------------
# Mandatory case 3 — idempotency
# ---------------------------------------------------------------------------

async def test_webhook_idempotency_two_posts_confirm_booking_once(
    client: AsyncClient, db: AsyncSession, mock_mp_sdk
):
    booking = await _make_pending_booking(db)
    data_id = "789"

    mock_mp_sdk.payment.return_value.get.return_value = _approved_payment_response(
        external_reference=str(booking.id),
    )

    x_sig = _make_valid_signature(data_id)
    body = {"data": {"id": data_id}}

    resp1 = await _post_webhook(client, data_id=data_id, x_signature=x_sig, body=body)
    assert resp1.status_code == 200
    assert resp1.json() == {"status": "ok"}

    # Rebuild a fresh signature (same ts is fine within replay window).
    resp2 = await _post_webhook(client, data_id=data_id, x_signature=x_sig, body=body)
    assert resp2.status_code == 200
    assert resp2.json() == {"status": "ok"}

    # Exactly one confirmed booking in the DB — not two.
    booking_id = booking.id
    db.expire_all()  # fuerza re-fetch desde DB, evita identity map cacheada
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking_db = result.scalar_one()
    assert booking_db.status == BookingStatusEnum.confirmed
    assert booking_db.mp_payment_id == "123456789"


# ---------------------------------------------------------------------------
# Happy path — approved payment confirms the booking
# ---------------------------------------------------------------------------

async def test_webhook_approved_payment_confirms_booking(
    client: AsyncClient, db: AsyncSession, mock_mp_sdk
):
    booking = await _make_pending_booking(db)
    data_id = "123456789"

    mock_mp_sdk.payment.return_value.get.return_value = _approved_payment_response(
        external_reference=str(booking.id),
        payment_id=123456789,
    )

    x_sig = _make_valid_signature(data_id)
    resp = await _post_webhook(
        client,
        data_id=data_id,
        x_signature=x_sig,
        body={"data": {"id": data_id}},
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    booking_id = booking.id
    db.expire_all()  # fuerza re-fetch desde DB, evita identity map cacheada
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking_db = result.scalar_one()
    assert booking_db.status == BookingStatusEnum.confirmed
    assert booking_db.confirmed_at is not None
    assert booking_db.mp_payment_id == "123456789"


# ---------------------------------------------------------------------------
# Mandatory case 4 — payment.status != "approved"
# ---------------------------------------------------------------------------

async def test_webhook_pending_payment_returns_ok_booking_stays_pending(
    client: AsyncClient, db: AsyncSession, mock_mp_sdk
):
    booking = await _make_pending_booking(db)
    data_id = "456"

    mock_mp_sdk.payment.return_value.get.return_value = {
        "status": 200,
        "response": {
            "id": 456,
            "status": "pending",
            "external_reference": str(booking.id),
            "transaction_amount": 24500.0,
        },
    }

    x_sig = _make_valid_signature(data_id)
    resp = await _post_webhook(
        client,
        data_id=data_id,
        x_signature=x_sig,
        body={"data": {"id": data_id}},
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    booking_id = booking.id
    db.expire_all()  # fuerza re-fetch desde DB, evita identity map cacheada
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking_db = result.scalar_one()
    assert booking_db.status == BookingStatusEnum.pending_payment


async def test_webhook_rejected_payment_returns_ok_booking_stays_pending(
    client: AsyncClient, db: AsyncSession, mock_mp_sdk
):
    booking = await _make_pending_booking(db)
    data_id = "457"

    mock_mp_sdk.payment.return_value.get.return_value = {
        "status": 200,
        "response": {
            "id": 457,
            "status": "rejected",
            "external_reference": str(booking.id),
            "transaction_amount": 24500.0,
        },
    }

    x_sig = _make_valid_signature(data_id)
    resp = await _post_webhook(
        client,
        data_id=data_id,
        x_signature=x_sig,
        body={"data": {"id": data_id}},
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    booking_id = booking.id
    db.expire_all()  # fuerza re-fetch desde DB, evita identity map cacheada
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking_db = result.scalar_one()
    assert booking_db.status == BookingStatusEnum.pending_payment


# ---------------------------------------------------------------------------
# MP API error
# ---------------------------------------------------------------------------

async def test_webhook_mp_api_error_returns_500(client: AsyncClient, mock_mp_sdk):
    data_id = "321"

    # get_payment raises PaymentProcessingError when status != 200.
    mock_mp_sdk.payment.return_value.get.return_value = {
        "status": 503,
        "response": {},
    }

    x_sig = _make_valid_signature(data_id)
    resp = await _post_webhook(
        client,
        data_id=data_id,
        x_signature=x_sig,
        body={"data": {"id": data_id}},
    )

    assert resp.status_code == 500
    assert resp.json() == {"status": "error"}


# ---------------------------------------------------------------------------
# Signature with x-request-id header
# ---------------------------------------------------------------------------

async def test_webhook_valid_signature_with_request_id(
    client: AsyncClient, db: AsyncSession, mock_mp_sdk
):
    booking = await _make_pending_booking(db)
    data_id = "999"
    request_id = "req-abc-123"

    mock_mp_sdk.payment.return_value.get.return_value = _approved_payment_response(
        external_reference=str(booking.id),
    )

    x_sig = _make_valid_signature(data_id, request_id=request_id)
    resp = await _post_webhook(
        client,
        data_id=data_id,
        x_signature=x_sig,
        body={"data": {"id": data_id}},
        request_id=request_id,
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
