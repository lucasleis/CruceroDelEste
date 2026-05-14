import asyncio
import hashlib
import hmac
from dataclasses import dataclass
from uuid import UUID

import mercadopago

from app.config import settings


class PaymentError(Exception):
    """MercadoPago API returned a non-success response."""


class InvalidWebhookSignature(Exception):
    """The x-signature header could not be validated."""


@dataclass
class PreferenceItem:
    title: str
    quantity: int
    unit_price: int  # ARS, integer pesos


@dataclass
class CreatedPreference:
    preference_id: str
    init_point: str


@dataclass
class PaymentDetails:
    payment_id: str
    status: str  # approved | pending | rejected | ...
    external_reference: str
    amount: int


_sdk: mercadopago.SDK | None = None


def _get_sdk() -> mercadopago.SDK:
    global _sdk
    if _sdk is None:
        _sdk = mercadopago.SDK(settings.mercadopago_access_token)
    return _sdk


async def create_preference(
    booking_id: UUID,
    items: list[PreferenceItem],
    payer_email: str,
) -> CreatedPreference:
    preference_data = {
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
        "notification_url": f"{settings.backend_url}/payments/webhook",
        "back_urls": {
            "success": f"{settings.frontend_url}/bookings/{booking_id}/success",
            "failure": f"{settings.frontend_url}/bookings/{booking_id}/failure",
            "pending": f"{settings.frontend_url}/bookings/{booking_id}/pending",
        },
        "auto_return": "approved",
    }

    sdk = _get_sdk()
    response = await asyncio.to_thread(sdk.preference().create, preference_data)

    if response.get("status") not in (200, 201):
        raise PaymentError(
            f"MercadoPago preference creation failed (status={response.get('status')})"
        )

    body = response.get("response") or {}
    return CreatedPreference(
        preference_id=body["id"],
        init_point=body["init_point"],
    )


async def get_payment(payment_id: str) -> PaymentDetails:
    sdk = _get_sdk()
    response = await asyncio.to_thread(sdk.payment().get, payment_id)

    if response.get("status") != 200:
        raise PaymentError(
            f"MercadoPago payment fetch failed (id={payment_id}, status={response.get('status')})"
        )

    body = response.get("response") or {}
    return PaymentDetails(
        payment_id=str(body["id"]),
        status=body["status"],
        external_reference=body.get("external_reference") or "",
        amount=int(body["transaction_amount"]),
    )


def verify_webhook_signature(
    data_id: str,
    x_signature: str,
    x_request_id: str,
) -> None:
    # x-signature format: "ts=<timestamp>,v1=<hex hmac-sha256>"
    # Signed manifest: "id:<data_id>;request-id:<request_id>;ts:<timestamp>;"
    if not x_signature:
        raise InvalidWebhookSignature("Missing x-signature header")

    parts: dict[str, str] = {}
    for chunk in x_signature.split(","):
        if "=" in chunk:
            key, value = chunk.strip().split("=", 1)
            parts[key] = value

    ts = parts.get("ts")
    received = parts.get("v1")
    if not ts or not received:
        raise InvalidWebhookSignature("Malformed x-signature header")

    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
    expected = hmac.new(
        settings.mercadopago_webhook_secret.encode(),
        manifest.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, received):
        raise InvalidWebhookSignature("Signature mismatch")
