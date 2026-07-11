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
from app.models.booking import Booking, BookingStatusEnum, Chargeback, ChargebackStatusEnum, Passenger
from app.models.trip import CountryEnum, Route, Seat, SeatStatusEnum, SeatTypeEnum, Stop, Trip, TripStatusEnum


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
    """Insert a Stop → Stop → Route → Trip → Seat → Booking → Passenger chain."""
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


# ===========================================================================
# POST /webhooks/chargebacks
# ===========================================================================
#
# MercadoPago's sandbox does not support simulating chargebacks (undocumented).
# All tests below mock both the webhook payload and the GET /v1/payments/{id}
# response so the handler logic can be exercised without real API calls.
# ---------------------------------------------------------------------------

async def _post_chargeback_webhook(
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
        "/webhooks/chargebacks",
        params={"data.id": data_id},
        headers=headers,
        json=body,
    )


def _charged_back_payment_response(
    external_reference: str,
    payment_id: int = 111222333,
    status_detail: str = "in_process",
) -> dict:
    return {
        "status": 200,
        "response": {
            "id": payment_id,
            "status": "charged_back",
            "status_detail": status_detail,
            "external_reference": external_reference,
            "transaction_amount": 24500.0,
        },
    }


async def _make_confirmed_booking_with_mp_payment(
    db: AsyncSession,
    mp_payment_id: str = "111222333",
) -> Booking:
    """Insert a confirmed booking with the given mp_payment_id."""
    booking = await _make_pending_booking(db)
    booking.status = BookingStatusEnum.confirmed
    booking.mp_payment_id = mp_payment_id
    booking.confirmed_at = datetime.now(timezone.utc)
    await db.flush()
    return booking


def _chargeback_body(data_id: str) -> dict:
    return {"type": "payment", "action": "payment.updated", "data": {"id": data_id}}


# ---------------------------------------------------------------------------
# Case 1 — booking not found for the given mp_payment_id
# ---------------------------------------------------------------------------

async def test_chargeback_webhook_booking_not_found_returns_200_no_persist(
    client: AsyncClient, db: AsyncSession, mock_mp_sdk
):
    # MP sandbox does not support simulating chargebacks; webhook payload and
    # GET /v1/payments response are mocked to exercise the handler logic.
    data_id = "999888777"
    unknown_booking_id = str(uuid.uuid4())  # valid UUID, not in DB

    mock_mp_sdk.payment.return_value.get.return_value = _charged_back_payment_response(
        external_reference=unknown_booking_id,
        payment_id=int(data_id),
    )

    x_sig = _make_valid_signature(data_id)
    resp = await _post_chargeback_webhook(
        client,
        data_id=data_id,
        x_signature=x_sig,
        body=_chargeback_body(data_id),
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    # Nothing persisted — no booking matched mp_payment_id.
    result = await db.execute(
        select(Chargeback).where(Chargeback.mp_payment_id == data_id)
    )
    assert result.scalar_one_or_none() is None


# ---------------------------------------------------------------------------
# Case 2 — booking exists → creates Chargeback with in_process
# ---------------------------------------------------------------------------

async def test_chargeback_webhook_creates_chargeback_in_process(
    client: AsyncClient, db: AsyncSession, mock_mp_sdk
):
    # MP sandbox does not support simulating chargebacks; mocked.
    mp_payment_id = "111222333"
    booking = await _make_confirmed_booking_with_mp_payment(db, mp_payment_id)

    mock_mp_sdk.payment.return_value.get.return_value = _charged_back_payment_response(
        external_reference=str(booking.id),
        payment_id=int(mp_payment_id),
        status_detail="in_process",
    )

    x_sig = _make_valid_signature(mp_payment_id)
    resp = await _post_chargeback_webhook(
        client,
        data_id=mp_payment_id,
        x_signature=x_sig,
        body=_chargeback_body(mp_payment_id),
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}

    booking_id = booking.id
    db.expire_all()

    # Chargeback row created with correct status and booking reference.
    result = await db.execute(
        select(Chargeback).where(Chargeback.mp_payment_id == mp_payment_id)
    )
    cb = result.scalar_one_or_none()
    assert cb is not None
    assert cb.status == ChargebackStatusEnum.in_process
    assert cb.booking_id == booking_id

    # Booking must remain confirmed — chargebacks do not mutate booking status.
    refreshed = await db.get(Booking, booking_id)
    assert refreshed.status == BookingStatusEnum.confirmed


# ---------------------------------------------------------------------------
# Case 3 — existing in_process chargeback updated to settled
# ---------------------------------------------------------------------------

async def test_chargeback_webhook_updates_to_settled(
    client: AsyncClient, db: AsyncSession, mock_mp_sdk
):
    # MP sandbox does not support simulating chargebacks; mocked.
    mp_payment_id = "444555666"
    booking = await _make_confirmed_booking_with_mp_payment(db, mp_payment_id)

    # Pre-insert an in_process Chargeback to simulate a prior notification.
    db.add(Chargeback(
        booking_id=booking.id,
        mp_payment_id=mp_payment_id,
        status=ChargebackStatusEnum.in_process,
    ))
    await db.flush()

    mock_mp_sdk.payment.return_value.get.return_value = _charged_back_payment_response(
        external_reference=str(booking.id),
        payment_id=int(mp_payment_id),
        status_detail="settled",
    )

    x_sig = _make_valid_signature(mp_payment_id)
    resp = await _post_chargeback_webhook(
        client,
        data_id=mp_payment_id,
        x_signature=x_sig,
        body=_chargeback_body(mp_payment_id),
    )

    assert resp.status_code == 200

    booking_id = booking.id
    db.expire_all()
    result = await db.execute(
        select(Chargeback).where(Chargeback.mp_payment_id == mp_payment_id)
    )
    cb = result.scalar_one()
    assert cb.status == ChargebackStatusEnum.settled

    refreshed = await db.get(Booking, booking_id)
    assert refreshed.status == BookingStatusEnum.confirmed


# ---------------------------------------------------------------------------
# Case 4 — existing chargeback updated to reimbursed
# ---------------------------------------------------------------------------

async def test_chargeback_webhook_updates_to_reimbursed(
    client: AsyncClient, db: AsyncSession, mock_mp_sdk
):
    # MP sandbox does not support simulating chargebacks; mocked.
    mp_payment_id = "777888999"
    booking = await _make_confirmed_booking_with_mp_payment(db, mp_payment_id)

    db.add(Chargeback(
        booking_id=booking.id,
        mp_payment_id=mp_payment_id,
        status=ChargebackStatusEnum.in_process,
    ))
    await db.flush()

    mock_mp_sdk.payment.return_value.get.return_value = _charged_back_payment_response(
        external_reference=str(booking.id),
        payment_id=int(mp_payment_id),
        status_detail="reimbursed",
    )

    x_sig = _make_valid_signature(mp_payment_id)
    resp = await _post_chargeback_webhook(
        client,
        data_id=mp_payment_id,
        x_signature=x_sig,
        body=_chargeback_body(mp_payment_id),
    )

    assert resp.status_code == 200

    booking_id = booking.id
    db.expire_all()
    result = await db.execute(
        select(Chargeback).where(Chargeback.mp_payment_id == mp_payment_id)
    )
    cb = result.scalar_one()
    assert cb.status == ChargebackStatusEnum.reimbursed

    refreshed = await db.get(Booking, booking_id)
    assert refreshed.status == BookingStatusEnum.confirmed


# ---------------------------------------------------------------------------
# Case 5 — invalid signature → 200, nothing persisted
# ---------------------------------------------------------------------------

async def test_chargeback_webhook_invalid_signature_returns_200_no_persist(
    client: AsyncClient, db: AsyncSession
):
    # MP sandbox does not support simulating chargebacks; mocked.
    # Invalid signature must return 200 (not 4xx) — returning 4xx would cause
    # MP to enter a retry loop for what may be a configuration error, not a
    # transient failure. Consistent with the payment webhook contract.
    data_id = "123999456"

    resp = await _post_chargeback_webhook(
        client,
        data_id=data_id,
        x_signature="ts=0,v1=invalidsignature",
        body=_chargeback_body(data_id),
    )

    assert resp.status_code == 200
    assert resp.json() == {"status": "ignored", "reason": "invalid_signature"}

    result = await db.execute(
        select(Chargeback).where(Chargeback.mp_payment_id == data_id)
    )
    assert result.scalar_one_or_none() is None
