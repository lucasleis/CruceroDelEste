import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_db
from app.errors import InvalidWebhookSignature, PaymentProcessingError
from app.models.booking import Booking, BookingStatusEnum, Passenger
from app.models.trip import Trip
from app.services.booking import confirm_booking
from app.services.email import EmailDeliveryError, send_confirmation_email
from app.services.payment import get_payment, verify_webhook_signature

logger = logging.getLogger(__name__)

router = APIRouter(tags=["payments"])

# Fixed response bodies — avoids constructing dicts on every request.
_OK = {"status": "ok"}
_IGN_INVALID_SIG = {"status": "ignored", "reason": "invalid_signature"}
_IGN_MALFORMED = {"status": "ignored", "reason": "malformed_payload"}
_IGN_NO_BOOKING = {"status": "ignored", "reason": "booking_not_found"}
_ERR = {"status": "error"}


@router.post("/webhooks/mercadopago", status_code=200)
async def mercadopago_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Receive MercadoPago payment notifications.

    Always returns 2xx so MP never enters a retry loop due to our response.
    Returns 500 only for transient server errors (DB down, etc.) where a retry
    from MP is genuinely useful.
    """
    try:
        # --- Step 1: data.id comes from the query string, NOT the JSON body. ---
        data_id: str | None = request.query_params.get("data.id")
        if not data_id:
            logger.warning(
                "webhook_malformed: missing data.id query param request_id=%s",
                request.headers.get("x-request-id"),
            )
            return JSONResponse(_IGN_MALFORMED)

        # --- Step 2: optional headers used for signature verification. ---
        x_request_id: str | None = request.headers.get("x-request-id")
        x_signature: str = request.headers.get("x-signature", "")

        # --- Steps 3-4: verify HMAC signature — rejects tampered / replayed requests. ---
        try:
            verify_webhook_signature(data_id, x_signature, x_request_id)
        except InvalidWebhookSignature:
            # Already logged with WARNING inside verify_webhook_signature.
            return JSONResponse(_IGN_INVALID_SIG)

        # --- Step 5: parse body to extract the payment ID. ---
        try:
            body = await request.json()
            payment_id = str(body["data"]["id"])
        except Exception:
            logger.warning(
                "webhook_malformed: bad JSON or missing body.data.id request_id=%s",
                x_request_id,
            )
            return JSONResponse(_IGN_MALFORMED)

        # --- Step 6: verify real payment status directly with MercadoPago. ---
        try:
            payment = await get_payment(payment_id)
        except PaymentProcessingError as exc:
            logger.error(
                "webhook_get_payment_failed: %s request_id=%s", exc, x_request_id
            )
            return JSONResponse(_ERR, status_code=500)

        # --- Step 7: only act on approved payments; pending/rejected are ignored. ---
        if payment.status != "approved":
            return JSONResponse(_OK)

        # --- Step 8: validate external_reference and lock the booking row. ---
        try:
            booking_id = UUID(payment.external_reference)
        except ValueError:
            logger.warning(
                "webhook_invalid_external_ref: value=%r request_id=%s",
                payment.external_reference,
                x_request_id,
            )
            return JSONResponse(_IGN_NO_BOOKING)

        result = await db.execute(
            # FOR UPDATE prevents two concurrent webhooks from double-confirming.
            select(Booking).where(Booking.id == booking_id).with_for_update()
        )
        booking = result.scalar_one_or_none()

        # --- Step 9: booking must exist. ---
        if booking is None:
            logger.warning(
                "webhook_booking_not_found: booking_id=%s request_id=%s",
                booking_id,
                x_request_id,
            )
            return JSONResponse(_IGN_NO_BOOKING)

        # --- Step 10: idempotency guard — MP may deliver the same event twice. ---
        if booking.status == BookingStatusEnum.confirmed:
            return JSONResponse(_OK)

        # --- Step 11: persist the confirmation. ---
        await confirm_booking(db, booking_id, payment.payment_id)
        await db.commit()

        # --- Step 12: send confirmation email to all passengers. ---
        result = await db.execute(
            select(Booking)
            .where(Booking.id == booking_id)
            .options(
                selectinload(Booking.passengers).selectinload(Passenger.seat),
                selectinload(Booking.trip).selectinload(Trip.route),
            )
        )
        booking_full = result.scalar_one()
        try:
            await send_confirmation_email(booking_full)
        except EmailDeliveryError as exc:
            logger.warning(
                "webhook_confirmation_email_failed booking_id=%s failed_emails=%s",
                booking_id, exc.failed_emails,
            )

        return JSONResponse(_OK)

    except Exception as exc:
        # Catch-all: unknown exception → 500 so MP will retry (transient failure).
        logger.exception("webhook_unexpected_error request_id=%s: %s",
                         request.headers.get("x-request-id"), exc)
        return JSONResponse(_ERR, status_code=500)
