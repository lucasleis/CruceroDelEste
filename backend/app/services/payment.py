"""MercadoPago payment service.

Network I/O uses the official `mercadopago` SDK (synchronous). Each SDK call
is wrapped with `asyncio.to_thread` so the FastAPI event loop stays free.

Webhook signature algorithm (confirmed from official MP docs and multiple
production implementations):
  - MP sends header:  x-signature: ts=<epoch_seconds>,v1=<hex_hmac_sha256>
  - Signed manifest:  "id:{data_id.lower()};[request-id:{x_request_id};]ts:{ts};"
                      (data_id lowercased; absent fields omitted, not written as None)
  - Key:              MERCADOPAGO_WEBHOOK_SECRET env variable
  - Digest:           HMAC-SHA256, hex-encoded
  - Replay window:    ts must be within 120 s past / 600 s future of server clock

Public API (unchanged from previous version):
  create_preference(booking_id, items, payer_email) -> CreatedPreference
  get_payment(payment_id) -> PaymentDetails
  verify_webhook_signature(data_id, x_signature, x_request_id) -> None  (raises on failure)
"""

import asyncio
import hashlib
import hmac
import logging
import time
from dataclasses import dataclass
from uuid import UUID

import mercadopago
from mercadopago.config import RequestOptions

from app.config import settings
from app.errors import InvalidWebhookSignature, PaymentProcessingError

logger = logging.getLogger(__name__)

# The SDK uses `requests` under the hood; `connection_timeout` is forwarded as
# the single `timeout=` argument and applies to both connect and read.
_REQUEST_TIMEOUT_S = 30.0
_REQUEST_OPTIONS = RequestOptions(connection_timeout=_REQUEST_TIMEOUT_S)

# Replay protection: reject webhooks whose ts is outside this window.
_REPLAY_PAST_S = 120
_REPLAY_FUTURE_S = 600

_sdk = mercadopago.SDK(settings.mercadopago_access_token)


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
    status: str  # "approved" | "pending" | "rejected" | "cancelled" | "charged_back" | ...
    status_detail: str  # e.g. "in_process" | "settled" | "reimbursed" for charged_back payments
    external_reference: str  # our booking_id, set when creating the preference


# ---------------------------------------------------------------------------
# Async API calls
# ---------------------------------------------------------------------------

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
        "notification_url": f"{settings.backend_url}/webhooks/mercadopago",
        "back_urls": {
            "success": f"{settings.frontend_url}/bookings/{booking_id}/success",
            "failure": f"{settings.frontend_url}/bookings/{booking_id}/failure",
            "pending": f"{settings.frontend_url}/bookings/{booking_id}/pending",
        },
        "auto_return": "approved",
    }

    result = await asyncio.to_thread(
        _sdk.preference().create, body, _REQUEST_OPTIONS,
    )

    status_code = result.get("status")
    if status_code not in (200, 201):
        raise PaymentProcessingError(
            f"Preference creation failed: HTTP {status_code}",
            status_code=status_code or 500,
        )

    data = result["response"]
    return CreatedPreference(
        preference_id=data["id"],
        init_point=data["init_point"],
    )


async def get_payment(payment_id: str) -> PaymentDetails:
    """Fetch a payment from MercadoPago by ID.

    Used by the webhook handler to verify the payment status after receiving
    a notification. Raises PaymentProcessingError on non-200 responses.
    """
    result = await asyncio.to_thread(
        _sdk.payment().get, payment_id, _REQUEST_OPTIONS,
    )

    status_code = result.get("status")
    if status_code != 200:
        raise PaymentProcessingError(
            f"Payment fetch failed: id={payment_id}, HTTP {status_code}",
            status_code=status_code or 500,
        )

    data = result["response"]
    external_reference = data.get("external_reference") or ""
    try:
        UUID(external_reference)
    except (ValueError, AttributeError, TypeError):
        raise PaymentProcessingError(
            "Invalid external_reference in payment response",
            status_code=502,
        )

    # MP returns transaction_amount as a float; the system stores amounts as
    # whole ARS pesos (no cents), so round to the nearest integer rather than
    # truncating to avoid off-by-one drift from float representation.
    return PaymentDetails(
        payment_id=str(data["id"]),
        status=data["status"],
        status_detail=data.get("status_detail") or "",
        external_reference=external_reference,
    )


async def create_refund(mp_payment_id: str) -> None:
    """Initiate a full refund for a MercadoPago payment.

    Raises PaymentProcessingError on any non-2xx response.
    The caller is responsible for updating the booking status after this returns.
    """
    result = await asyncio.to_thread(
        _sdk.payment().refunds, mp_payment_id, {}, _REQUEST_OPTIONS,
    )

    status_code = result.get("status")
    if status_code not in (200, 201):
        raise PaymentProcessingError(
            f"Refund creation failed: payment_id={mp_payment_id}, HTTP {status_code}",
            status_code=status_code or 500,
        )


# ---------------------------------------------------------------------------
# Webhook signature verification (pure computation, sync)
# ---------------------------------------------------------------------------

def verify_webhook_signature(
    data_id: str,
    x_signature: str,
    x_request_id: str | None,
) -> None:
    """Verify the MercadoPago webhook x-signature header.

    Callers MUST extract data_id from the query parameter "data.id"
    (request.query_params["data.id"]), NOT from the JSON body.
    x_request_id comes from the "x-request-id" HTTP header (may be absent → None).

    Manifest format (per MP docs):
      - data_id is lowercased before insertion
      - absent fields (x_request_id is None/empty) are omitted entirely
      - "id:{data_id.lower()};[request-id:{x_request_id};]ts:{ts};"

    x-signature header format: ts=<epoch_seconds>,v1=<hex_hmac_sha256>

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
    # Rules (per MP docs): data_id is lowercased; absent fields are omitted
    # entirely (not written as "field:None;").
    manifest_parts = [f"id:{data_id.lower()}"]
    if x_request_id:
        manifest_parts.append(f"request-id:{x_request_id}")
    manifest_parts.append(f"ts:{ts_raw}")
    manifest = ";".join(manifest_parts) + ";"
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
