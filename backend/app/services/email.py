"""Email service backed by Resend, with three transactional templates.

Templates live in /backend/templates/email/ and are rendered with Jinja2
(HTML body + plain-text fallback). Every send is per-passenger: each function
iterates `booking.passengers` and sends one Resend email per recipient.

The Resend SDK is synchronous, so each `Emails.send` call is wrapped with
`asyncio.to_thread` (same pattern as `app/services/payment.py`) to keep the
FastAPI event loop free.

Error semantics — matches the approved design:
  - send_confirmation_email : raises on the first failed send (logger.error).
    Called inline from the MercadoPago webhook handler; an exception bubbles
    up to a 500, which causes MP to retry (acceptable per CLAUDE.md).
  - send_reminder_email     : per-passenger failure is logged at WARNING and
    swallowed (never re-raised). Caller MUST NOT mark booking.reminder_sent
    when any passenger send was logged as failed.
  - send_feedback_email     : same swallow semantics as reminder.

NOTE on reminder/feedback success signalling: the function signature is
`-> None`, so the caller cannot distinguish all-passengers-succeeded from
some-failed by return value alone. This is a known limitation to be
resolved when `tasks/reminders.py` is implemented.
"""

import asyncio
import logging
from pathlib import Path

import resend
from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape

from app.config import settings
from app.models.booking import Booking, Passenger

logger = logging.getLogger(__name__)

_FROM_EMAIL = "no-reply@crucerodeleste.com"
_TEMPLATES_DIR = Path(__file__).resolve().parents[2] / "templates" / "email"

_env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
    undefined=StrictUndefined,
)

resend.api_key = settings.resend_api_key


def _render(template_name: str, context: dict) -> str:
    return _env.get_template(template_name).render(**context)


def _send_sync(*, to: str, subject: str, html: str, text: str) -> str:
    """Synchronous Resend call. Wrapped by callers in asyncio.to_thread."""
    params = {
        "from": _FROM_EMAIL,
        "to": [to],
        "subject": subject,
        "html": html,
        "text": text,
    }
    result = resend.Emails.send(params)
    return result["id"]


def _context_for(booking: Booking, passenger: Passenger) -> dict:
    trip = booking.trip
    seat = passenger.seat
    return {
        "first_name": passenger.first_name,
        "last_name": passenger.last_name,
        "booking_id": str(booking.id),
        "seat_number": seat.seat_number,
        "seat_type": seat.seat_type.value,
        "origin": trip.route.origin,
        "destination": trip.route.destination,
        "departure_at": trip.departure_at,
        "arrival_at": trip.arrival_at,
        "total_amount": booking.total_amount,
        "frontend_url": settings.frontend_url,
    }


class EmailDeliveryError(Exception):
    """Raised when one or more confirmation emails could not be delivered."""

    def __init__(self, failed_emails: list[str]):
        self.failed_emails = failed_emails
        super().__init__(
            f"Failed to deliver confirmation to: {', '.join(failed_emails)}"
        )


async def send_confirmation_email(booking: Booking) -> None:
    """Send the purchase-confirmation email to every passenger of the booking.

    Each passenger gets up to 3 attempts (1 original + 2 immediate retries, no
    sleep between attempts). All passengers are processed even if some fail;
    a per-passenger ERROR is logged after exhausting attempts and the address
    is collected into a `failed` list. If `failed` is non-empty at the end of
    the loop, an EmailDeliveryError is raised carrying every failed email.

    Caller contract: booking.passengers, booking.trip, booking.trip.route, and
    passenger.seat MUST be eagerly loaded (e.g. via `selectinload`) before
    invoking this function. Async SQLAlchemy raises MissingGreenlet on lazy
    attribute access outside the original session context.
    """
    failed: list[str] = []
    for passenger in booking.passengers:
        ctx = _context_for(booking, passenger)
        subject = f"Confirmación de compra — Crucero Del Este #{ctx['booking_id'][:8]}"
        html = _render("confirmation.html", ctx)
        text = _render("confirmation.txt", ctx)

        resend_id: str | None = None
        last_exc: Exception | None = None
        for _ in range(3):
            try:
                resend_id = await asyncio.to_thread(
                    _send_sync, to=passenger.email, subject=subject, html=html, text=text,
                )
                break
            except Exception as exc:
                last_exc = exc

        if resend_id is None:
            logger.error(
                "confirmation_email_failed booking_id=%s passenger_email=%s",
                booking.id, passenger.email, exc_info=last_exc,
            )
            failed.append(passenger.email)
        else:
            logger.info(
                "confirmation_email_sent booking_id=%s passenger_email=%s resend_id=%s",
                booking.id, passenger.email, resend_id,
            )

    if failed:
        raise EmailDeliveryError(failed)


async def send_reminder_email(booking: Booking) -> None:
    """Send the pre-trip reminder email to every passenger.

    Per-passenger failures are logged at WARNING and swallowed. Caller must
    treat any logged failure as grounds to leave booking.reminder_sent = False
    so the next scheduler tick retries.
    """
    for passenger in booking.passengers:
        ctx = _context_for(booking, passenger)
        subject = "Recordatorio de viaje — Crucero Del Este"
        try:
            html = _render("reminder.html", ctx)
            text = _render("reminder.txt", ctx)
            resend_id = await asyncio.to_thread(
                _send_sync, to=passenger.email, subject=subject, html=html, text=text,
            )
        except Exception:
            logger.warning(
                "reminder_email_failed booking_id=%s passenger_email=%s",
                booking.id, passenger.email, exc_info=True,
            )
            continue
        logger.info(
            "reminder_email_sent booking_id=%s passenger_email=%s resend_id=%s",
            booking.id, passenger.email, resend_id,
        )


async def send_feedback_email(booking: Booking) -> None:
    """Send the post-trip feedback email to every passenger.

    Same swallow-and-log semantics as send_reminder_email.
    """
    for passenger in booking.passengers:
        ctx = _context_for(booking, passenger)
        subject = "¿Cómo fue tu viaje? — Crucero Del Este"
        try:
            html = _render("feedback.html", ctx)
            text = _render("feedback.txt", ctx)
            resend_id = await asyncio.to_thread(
                _send_sync, to=passenger.email, subject=subject, html=html, text=text,
            )
        except Exception:
            logger.warning(
                "feedback_email_failed booking_id=%s passenger_email=%s",
                booking.id, passenger.email, exc_info=True,
            )
            continue
        logger.info(
            "feedback_email_sent booking_id=%s passenger_email=%s resend_id=%s",
            booking.id, passenger.email, resend_id,
        )
