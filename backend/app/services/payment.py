"""MercadoPago payment service.

All I/O is done with httpx.AsyncClient — no sync SDK, no asyncio.to_thread.

Webhook signature algorithm (confirmed from official MP docs and multiple
production implementations):
  - MP sends header:  x-signature: ts=<epoch_seconds>,v1=<hex_hmac_sha256>
  - Signed manifest:  "id:{data_id};request-id:{x_request_id};ts:{ts};"
  - Key:              MERCADOPAGO_WEBHOOK_SECRET env variable
  - Digest:           HMAC-SHA256, hex-encoded
  - Replay window:    ts must be within 120 s past / 600 s future of server clock

Public API (unchanged from previous version):
  create_preference(booking_id, items, payer_email) -> CreatedPreference
  get_payment(payment_id) -> PaymentDetails
  verify_webhook_signature(data_id, x_signature, x_request_id) -> None  (raises on failure)
"""

import hashlib
import hmac
import logging
import time
from dataclasses import dataclass
from uuid import UUID

import httpx

from app.config import settings
from app.exceptions import InvalidWebhookSignature, PaymentProcessingError

logger = logging.getLogger(__name__)

_MP_API_BASE = "https://api.mercadopago.com"

# Per httpx docs: connect/write share 5 s; read up to 30 s to handle slow MP responses.
_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=5.0, pool=5.0)

# Replay protection: reject webhooks whose ts is outside this window.
_REPLAY_PAST_S = 120
_REPLAY_FUTURE_S = 600


# ---------------------------------------------------------------------------
# Data transfer objects
# ---------------------------------------------------------------------------

@dataclass
class PreferenceItem:
    title: str
    quantity: int
    unit_price: int  # ARS, integer pesos (MP accepts float, we store int)


@dataclass
class CreatedPreference:
    preference_id: str
    init_point: str  # MP-hosted checkout URL to redirect the buyer to


@dataclass
class PaymentDetails:
    payment_id: str
    status: str  # "approved" | "pending" | "rejected" | "cancelled" | ...
    external_reference: str  # our booking_id, set when creating the preference
    amount: int  # ARS, integer pesos


# ---------------------------------------------------------------------------
# Async API calls
# ---------------------------------------------------------------------------

def _auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {settings.mercadopago_access_token}"}


async def create_preference(
    booking_id: UUID,
    items: list[PreferenceItem],
    payer_email: str,
) -> CreatedPreference:
    """Create a MercadoPago Checkout Pro preference for a booking.

    On success returns the preference ID and the init_point URL to redirect
    the buyer. Raises PaymentProcessingError on any non-2xx response.
    """
    body = {
        "items": [
            {
                "title": item.title,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "currency_id": "ARS",
            }
            for item in items
        ],
        "payer": {"email": payer_email},
        "external_reference": str(booking_id),
        # MP will POST to this URL on every payment status change.
        "notification_url": f"{settings.backend_url}/payments/webhook",
        "back_urls": {
            "success": f"{settings.frontend_url}/bookings/{booking_id}/success",
            "failure": f"{settings.frontend_url}/bookings/{booking_id}/failure",
            "pending": f"{settings.frontend_url}/bookings/{booking_id}/pending",
        },
        "auto_return": "approved",
    }

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.post(
            f"{_MP_API_BASE}/checkout/preferences",
            json=body,
            headers=_auth_headers(),
        )

    if response.status_code not in (200, 201):
        raise PaymentProcessingError(
            f"Preference creation failed: HTTP {response.status_code}",
            status_code=response.status_code,
        )

    data = response.json()
    return CreatedPreference(
        preference_id=data["id"],
        init_point=data["init_point"],
    )


async def get_payment(payment_id: str) -> PaymentDetails:
    """Fetch a payment from MercadoPago by ID.

    Used by the webhook handler to verify the payment status after receiving
    a notification. Raises PaymentProcessingError on non-200 responses.
    """
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        response = await client.get(
            f"{_MP_API_BASE}/v1/payments/{payment_id}",
            headers=_auth_headers(),
        )

    if response.status_code != 200:
        raise PaymentProcessingError(
            f"Payment fetch failed: id={payment_id}, HTTP {response.status_code}",
            status_code=response.status_code,
        )

    data = response.json()
    return PaymentDetails(
        payment_id=str(data["id"]),
        status=data["status"],
        external_reference=data.get("external_reference") or "",
        amount=int(data["transaction_amount"]),
    )


# ---------------------------------------------------------------------------
# Webhook signature verification (pure computation, sync)
# ---------------------------------------------------------------------------

def verify_webhook_signature(
    data_id: str,
    x_signature: str,
    x_request_id: str,
) -> None:
    """Verify the MercadoPago webhook x-signature header.

    MP signs each notification with HMAC-SHA256 over the manifest:
        "id:{data_id};request-id:{x_request_id};ts:{ts};"

    The x-signature header format is:
        ts=<epoch_seconds>,v1=<hex_hmac_sha256>

    Raises InvalidWebhookSignature on any validation failure.
    Does NOT log the raw signature value or payload to avoid leaking PII.
    """
    if not x_signature:
        logger.warning(
            "webhook_signature_missing request_id=%s data_id=%s",
            x_request_id, data_id,
        )
        raise InvalidWebhookSignature("Missing x-signature header")

    # Parse "ts=VALUE,v1=VALUE" — tolerate extra spaces around separators.
    parts: dict[str, str] = {}
    for chunk in x_signature.split(","):
        if "=" in chunk:
            k, v = chunk.strip().split("=", 1)
            parts[k.strip()] = v.strip()

    ts_raw = parts.get("ts")
    received_digest = parts.get("v1")

    if not ts_raw or not received_digest:
        logger.warning(
            "webhook_signature_malformed request_id=%s data_id=%s",
            x_request_id, data_id,
        )
        raise InvalidWebhookSignature("Malformed x-signature header (missing ts or v1)")

    # Replay protection: reject stale or future-dated requests.
    now = int(time.time())
    try:
        ts = int(ts_raw)
    except ValueError:
        logger.warning(
            "webhook_signature_ts_invalid request_id=%s data_id=%s",
            x_request_id, data_id,
        )
        raise InvalidWebhookSignature("Non-integer ts in x-signature")

    if ts < now - _REPLAY_PAST_S or ts > now + _REPLAY_FUTURE_S:
        logger.warning(
            "webhook_signature_replay_rejected request_id=%s data_id=%s "
            "ts_age_s=%d",
            x_request_id, data_id, now - ts,
        )
        raise InvalidWebhookSignature("Timestamp outside replay protection window")

    # HMAC-SHA256 over the canonical manifest string.
    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts_raw};"
    expected_digest = hmac.new(
        settings.mercadopago_webhook_secret.encode(),
        manifest.encode(),
        hashlib.sha256,
    ).hexdigest()

    # Timing-safe comparison prevents side-channel attacks.
    if not hmac.compare_digest(expected_digest, received_digest):
        logger.warning(
            "webhook_signature_mismatch request_id=%s data_id=%s",
            x_request_id, data_id,
        )
        raise InvalidWebhookSignature("Signature mismatch")
