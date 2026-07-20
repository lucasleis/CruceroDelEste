"""Unit tests for app/services/email.py — payload construction and error semantics."""

import datetime
import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.models.booking import BookingStatusEnum
from app.services.email import (
    EmailDeliveryError,
    send_confirmation_email,
    send_feedback_email,
    send_reminder_email,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_booking(*, status: BookingStatusEnum = BookingStatusEnum.confirmed) -> tuple:
    """Return (booking_mock, passenger_mock) with all attributes _context_for needs."""
    now = datetime.datetime.now(datetime.UTC)

    seat = MagicMock()
    seat.seat_number = "1A"
    seat.seat_type.value = "cama"

    passenger = MagicMock()
    passenger.first_name = "Ana"
    passenger.last_name = "García"
    passenger.email = "ana@example.com"
    passenger.seat = seat

    origin_stop = MagicMock()
    origin_stop.name = "Retiro"
    destination_stop = MagicMock()
    destination_stop.name = "Asunción"

    route = MagicMock()
    route.origin_stop = origin_stop
    route.destination_stop = destination_stop

    trip = MagicMock()
    trip.route = route
    trip.departure_at = now + datetime.timedelta(hours=72)
    trip.arrival_at = now + datetime.timedelta(hours=89)

    booking = MagicMock()
    booking.id = uuid.uuid4()
    booking.status = status
    booking.passengers = [passenger]
    booking.trip = trip
    booking.total_amount = 24500

    return booking, passenger


# ---------------------------------------------------------------------------
# send_confirmation_email
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_send_confirmation_payload():
    booking, passenger = _make_booking()

    with patch("resend.Emails.send", return_value={"id": "test-id"}) as mock_send:
        await send_confirmation_email(booking)

    mock_send.assert_called_once()
    payload = mock_send.call_args[0][0]

    assert payload["from"] == "no-reply@expresorioparana.com"
    assert payload["to"] == [passenger.email]
    assert str(booking.id)[:8] in payload["subject"]
    assert isinstance(payload["html"], str) and payload["html"]
    assert isinstance(payload["text"], str) and payload["text"]


@pytest.mark.asyncio
async def test_send_confirmation_skips_non_confirmed_booking():
    booking, _ = _make_booking(status=BookingStatusEnum.pending_payment)

    with patch("resend.Emails.send", return_value={"id": "test-id"}) as mock_send:
        await send_confirmation_email(booking)

    mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_send_confirmation_raises_email_delivery_error_on_failure():
    booking, passenger = _make_booking()

    with patch("resend.Emails.send", side_effect=Exception("resend down")):
        with pytest.raises(EmailDeliveryError) as exc_info:
            await send_confirmation_email(booking)

    assert passenger.email in exc_info.value.failed_emails


# ---------------------------------------------------------------------------
# send_reminder_email
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_send_reminder_payload():
    booking, passenger = _make_booking()

    with patch("resend.Emails.send", return_value={"id": "test-id"}) as mock_send:
        result = await send_reminder_email(booking)

    mock_send.assert_called_once()
    payload = mock_send.call_args[0][0]

    assert payload["subject"] == "Recordatorio de viaje — Expreso Río Paraná"
    assert payload["to"] == [passenger.email]
    assert isinstance(payload["html"], str) and payload["html"]
    assert isinstance(payload["text"], str) and payload["text"]
    assert result is True


@pytest.mark.asyncio
async def test_send_reminder_returns_false_on_failure():
    booking, _ = _make_booking()

    with patch("resend.Emails.send", side_effect=Exception("resend down")):
        result = await send_reminder_email(booking)

    assert result is False


# ---------------------------------------------------------------------------
# send_feedback_email
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_send_feedback_payload():
    booking, passenger = _make_booking()

    with patch("resend.Emails.send", return_value={"id": "test-id"}) as mock_send:
        result = await send_feedback_email(booking)

    mock_send.assert_called_once()
    payload = mock_send.call_args[0][0]

    assert payload["subject"] == "¿Cómo fue tu viaje? — Expreso Río Paraná"
    assert payload["to"] == [passenger.email]
    assert isinstance(payload["html"], str) and payload["html"]
    assert isinstance(payload["text"], str) and payload["text"]
    assert result is True


@pytest.mark.asyncio
async def test_send_feedback_returns_false_on_failure():
    booking, _ = _make_booking()

    with patch("resend.Emails.send", side_effect=Exception("resend down")):
        result = await send_feedback_email(booking)

    assert result is False
