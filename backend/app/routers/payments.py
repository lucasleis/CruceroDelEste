import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_db, trip_load_options
from app.errors import ChargebackAlreadyInStatusError, InvalidWebhookSignature, PaymentProcessingError, SeatAlreadyReleasedError
from app.models.booking import Booking, BookingStatusEnum, Passenger

from app.services.booking import confirm_booking
from app.services.chargeback import upsert_chargeback
from app.services.email import send_confirmation_email
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
            if payment_id != data_id:
                logger.warning(
                    "webhook_malformed: data_id mismatch query=%r body=%r request_id=%s",
                    data_id,
                    payment_id,
                    x_request_id,
                )
                return JSONResponse(_IGN_MALFORMED)
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
            booking_id = UUID(payment.external_reference or "")
        except (ValueError, AttributeError, TypeError):
            logger.error(
                "webhook_invalid_external_reference payment_id=%s", payment_id,
            )
            return JSONResponse(_OK)

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
        try:
            await confirm_booking(db, booking_id, payment.payment_id)
            await db.commit()
        except SeatAlreadyReleasedError as exc:
            logger.error(
                "webhook_seat_already_released booking_id=%s payment_id=%s seat_id=%s",
                booking_id, payment.payment_id, exc.seat_id,
            )
            return JSONResponse(_OK)

        # --- Step 11b: verify the booking was actually confirmed. ---
        await db.refresh(booking)
        if booking.status != BookingStatusEnum.confirmed:
            logger.error(
                "webhook_payment_approved_booking_not_confirmed "
                "booking_id=%s payment_id=%s booking_total_amount=%s booking_status=%s",
                booking_id,
                payment.payment_id,
                booking.total_amount,
                booking.status.value,
            )
            return JSONResponse(_OK)

        # --- Step 12: send confirmation email to all passengers. ---
        result = await db.execute(
            select(Booking)
            .where(Booking.id == booking_id)
            .options(
                selectinload(Booking.passengers).selectinload(Passenger.seat),
                selectinload(Booking.trip).options(trip_load_options()),
            )
        )
        booking_full = result.scalar_one()
        try:
            await send_confirmation_email(booking_full)
        except Exception as exc:
            logger.warning(
                "webhook_confirmation_email_failed booking_id=%s error=%s",
                booking_id,
                exc,
            )

        return JSONResponse(_OK)

    except Exception as exc:
        # Catch-all: unknown exception → 500 so MP will retry (transient failure).
        logger.exception("webhook_unexpected_error request_id=%s: %s",
                         request.headers.get("x-request-id"), exc)
        return JSONResponse(_ERR, status_code=500)


@router.post("/webhooks/chargebacks", status_code=200)
async def chargebacks_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Receive MercadoPago chargeback and fraud-alert notifications.

    Subscribes to topic_chargebacks_wh and stop_delivery_op_wh.
    Always returns 2xx — MP retries on non-2xx (stop_delivery_op has no retry,
    so any status is final for that event type).
    """
    try:
        # --- Step 1: data.id from query string (same convention as payment webhook). ---
        data_id: str | None = request.query_params.get("data.id")
        if not data_id:
            logger.warning(
                "chargeback_webhook_malformed: missing data.id request_id=%s",
                request.headers.get("x-request-id"),
            )
            return JSONResponse(_IGN_MALFORMED)

        x_request_id: str | None = request.headers.get("x-request-id")
        x_signature: str = request.headers.get("x-signature", "")

        # --- Step 2: HMAC verification — same algorithm as the payment webhook. ---
        try:
            verify_webhook_signature(data_id, x_signature, x_request_id)
        except InvalidWebhookSignature:
            return JSONResponse(_IGN_INVALID_SIG)

        # --- Step 3: parse body and read notification type. ---
        try:
            body = await request.json()
            event_type: str = str(body.get("type", ""))
            event_action: str = str(body.get("action", ""))
        except Exception:
            logger.warning(
                "chargeback_webhook_malformed: bad JSON request_id=%s", x_request_id,
            )
            return JSONResponse(_IGN_MALFORMED)

        # --- Step 4: route by notification type. ---
        # topic_chargebacks_wh arrives as type="payment", action="payment.updated".
        # stop_delivery_op_wh (pre-chargeback fraud alert, no retry) arrives as
        # type="stop_delivery_op". Both are handled: treat stop_delivery_op as a
        # chargeback in_process because it signals an imminent dispute.
        if event_type == "stop_delivery_op":
            logger.warning(
                "chargeback_stop_delivery_op mp_payment_id=%s request_id=%s",
                data_id, x_request_id,
            )
            # Fall through to step 5 — persist as in_process.
        elif event_type != "payment" or event_action != "payment.updated":
            logger.warning(
                "chargeback_webhook_unknown_type type=%r action=%r request_id=%s",
                event_type, event_action, x_request_id,
            )
            return JSONResponse(_OK)

        # --- Step 5: fetch real payment status from MercadoPago. ---
        try:
            payment = await get_payment(data_id)
        except PaymentProcessingError as exc:
            logger.error(
                "chargeback_webhook_get_payment_failed: %s request_id=%s",
                exc, x_request_id,
            )
            return JSONResponse(_ERR, status_code=500)

        # --- Step 6: only act on charged_back payments. ---
        if payment.status != "charged_back":
            return JSONResponse(_OK)

        # --- Step 7: find booking by mp_payment_id. ---
        booking_result = await db.execute(
            select(Booking).where(Booking.mp_payment_id == data_id)
        )
        booking = booking_result.scalar_one_or_none()
        if booking is None:
            logger.warning(
                "chargeback_booking_not_found mp_payment_id=%s request_id=%s",
                data_id, x_request_id,
            )
            return JSONResponse(_OK)

        # --- Step 8: upsert Chargeback — create or update. ---
        try:
            await upsert_chargeback(db, booking.id, data_id, payment.status_detail)
        except ChargebackAlreadyInStatusError:
            return JSONResponse(_OK)

        # --- Step 9: commit. The booking status is intentionally NOT changed. ---
        await db.commit()
        return JSONResponse(_OK)

    except Exception as exc:
        logger.exception(
            "chargeback_webhook_unexpected_error request_id=%s: %s",
            request.headers.get("x-request-id"), exc,
        )
        return JSONResponse(_ERR, status_code=500)
