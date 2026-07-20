"""Integration tests for the scheduled job in tasks/reminders.py.

``expire_bookings_job`` is what actually returns unsold inventory to the pool
in production: it finds pending bookings past ``expires_at`` and releases their
seats. ``expire_booking`` (the per-booking service) is covered elsewhere, but
the *job wrapper* — its query filter and its commit-per-booking loop — has no
coverage. A regression there silently strands seats as ``reserved`` forever.

The job opens its own sessions via ``tasks.reminders.AsyncSessionLocal`` (not
the injected request session), so we patch that name to a sessionmaker bound to
the test engine. That is the only thing mocked; the real job logic runs against
the real test database.

Requires the same Postgres backend as every other integration test.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

import tasks.reminders as reminders
from app.models.booking import Booking, BookingStatusEnum, Passenger
from app.models.trip import (
    CountryEnum,
    Route,
    Seat,
    SeatStatusEnum,
    SeatTypeEnum,
    Stop,
    Trip,
    TripStatusEnum,
)

_NOW = datetime.now(timezone.utc)


@pytest.fixture
def session_factory(test_engine):
    return async_sessionmaker(
        bind=test_engine, class_=AsyncSession, expire_on_commit=False
    )


async def _seed_pending_booking(
    session_factory, *, expires_at: datetime
) -> tuple:
    """Create a pending_payment booking with one reserved seat.

    Returns (booking_id, seat_id). Committed so the job's own sessions see it.
    """
    async with session_factory() as db:
        origin = Stop(name="Retiro", country=CountryEnum.AR)
        destination = Stop(name="Asunción", country=CountryEnum.PY)
        db.add_all([origin, destination])
        await db.flush()
        route = Route(origin_stop_id=origin.id, destination_stop_id=destination.id)
        db.add(route)
        await db.flush()
        trip = Trip(
            route_id=route.id,
            departure_at=_NOW + timedelta(days=2),
            arrival_at=_NOW + timedelta(days=2, hours=4),
            status=TripStatusEnum.scheduled,
        )
        db.add(trip)
        await db.flush()
        seat = Seat(
            trip_id=trip.id,
            seat_number="1",
            seat_type=SeatTypeEnum.cama,
            status=SeatStatusEnum.reserved,
            reserved_at=_NOW - timedelta(minutes=30),
        )
        db.add(seat)
        await db.flush()
        booking = Booking(
            trip_id=trip.id,
            status=BookingStatusEnum.pending_payment,
            contact_email="ana@example.com",
            total_amount=24500,
            expires_at=expires_at,
        )
        db.add(booking)
        await db.flush()
        db.add(
            Passenger(
                booking_id=booking.id,
                seat_id=seat.id,
                first_name="Ana",
                last_name="García",
                dni="12345678",
                email="ana@example.com",
            )
        )
        await db.commit()
        return booking.id, seat.id


async def test_expire_bookings_job_expira_reserva_vencida_y_libera_su_asiento(
    session_factory,
):
    # arrange: reserva pendiente ya vencida (expires_at en el pasado)
    booking_id, seat_id = await _seed_pending_booking(
        session_factory, expires_at=_NOW - timedelta(minutes=1)
    )

    # act: correr el job con sus sesiones apuntando a la DB de test
    with patch.object(reminders, "AsyncSessionLocal", session_factory):
        await reminders.expire_bookings_job()

    # assert: la reserva pasó a expired y el asiento volvió a available
    async with session_factory() as db:
        booking = await db.get(Booking, booking_id)
        seat = await db.get(Seat, seat_id)
        assert booking.status == BookingStatusEnum.expired
        assert seat.status == SeatStatusEnum.available


async def test_expire_bookings_job_no_toca_reservas_aun_vigentes(session_factory):
    # arrange: reserva pendiente que todavía NO venció (expires_at en el futuro)
    booking_id, seat_id = await _seed_pending_booking(
        session_factory, expires_at=_NOW + timedelta(minutes=10)
    )

    # act
    with patch.object(reminders, "AsyncSessionLocal", session_factory):
        await reminders.expire_bookings_job()

    # assert: sigue pendiente y el asiento sigue reservado
    async with session_factory() as db:
        booking = await db.get(Booking, booking_id)
        seat = await db.get(Seat, seat_id)
        assert booking.status == BookingStatusEnum.pending_payment
        assert seat.status == SeatStatusEnum.reserved


# ---------------------------------------------------------------------------
# send_reminders_job
# ---------------------------------------------------------------------------

async def _seed_confirmed_booking(
    session_factory, *, departure_at: datetime
) -> object:
    """Create a confirmed booking with one passenger and eager-loadable relations.

    Returns booking_id. Committed so the job's own sessions see it.
    """
    async with session_factory() as db:
        origin = Stop(name="Retiro", country=CountryEnum.AR)
        destination = Stop(name="Asunción", country=CountryEnum.PY)
        db.add_all([origin, destination])
        await db.flush()
        route = Route(origin_stop_id=origin.id, destination_stop_id=destination.id)
        db.add(route)
        await db.flush()
        trip = Trip(
            route_id=route.id,
            departure_at=departure_at,
            arrival_at=departure_at + timedelta(hours=17),
            status=TripStatusEnum.scheduled,
        )
        db.add(trip)
        await db.flush()
        seat = Seat(
            trip_id=trip.id,
            seat_number="1",
            seat_type=SeatTypeEnum.cama,
            status=SeatStatusEnum.sold,
        )
        db.add(seat)
        await db.flush()
        booking = Booking(
            trip_id=trip.id,
            status=BookingStatusEnum.confirmed,
            contact_email="ana@example.com",
            total_amount=24500,
            expires_at=_NOW + timedelta(minutes=15),
            confirmed_at=_NOW - timedelta(days=1),
            reminder_sent=False,
        )
        db.add(booking)
        await db.flush()
        db.add(
            Passenger(
                booking_id=booking.id,
                seat_id=seat.id,
                first_name="Ana",
                last_name="García",
                dni="12345678",
                email="ana@example.com",
            )
        )
        await db.commit()
        return booking.id


async def test_send_reminders_job_envia_reminder_y_marca_sent(session_factory):
    # arrange: confirmed, reminder_sent=False, salida en 12h (dentro de la ventana 0–24h)
    booking_id = await _seed_confirmed_booking(
        session_factory, departure_at=_NOW + timedelta(hours=12)
    )

    # act
    with patch.object(reminders, "AsyncSessionLocal", session_factory):
        await reminders.send_reminders_job()

    # assert: reminder_sent pasó a True
    async with session_factory() as db:
        booking = await db.get(Booking, booking_id)
        assert booking.reminder_sent is True


async def test_send_reminders_job_no_toca_bookings_fuera_de_ventana(session_factory):
    # arrange: confirmed, reminder_sent=False, salida en 48h (fuera de la ventana de 24h)
    booking_id = await _seed_confirmed_booking(
        session_factory, departure_at=_NOW + timedelta(hours=48)
    )

    # act
    with patch.object(reminders, "AsyncSessionLocal", session_factory):
        await reminders.send_reminders_job()

    # assert: reminder_sent sigue en False
    async with session_factory() as db:
        booking = await db.get(Booking, booking_id)
        assert booking.reminder_sent is False


async def test_send_reminders_job_no_reenvía_si_ya_sent(session_factory):
    # arrange: confirmed, reminder_sent=True, salida en 12h
    booking_id = await _seed_confirmed_booking(
        session_factory, departure_at=_NOW + timedelta(hours=12)
    )
    # marcar reminder_sent=True directamente en DB
    async with session_factory() as db:
        booking = await db.get(Booking, booking_id)
        booking.reminder_sent = True
        await db.commit()

    # act
    with patch.object(reminders, "AsyncSessionLocal", session_factory):
        with patch("tasks.reminders.send_reminder_email") as mock_send:
            await reminders.send_reminders_job()

    # assert: send_reminder_email no fue llamada
    mock_send.assert_not_called()


# ---------------------------------------------------------------------------
# send_feedback_job
# ---------------------------------------------------------------------------

async def test_send_feedback_job_envia_feedback_y_marca_sent(session_factory):
    # arrange: confirmed, feedback_sent=False, departure hace 20h → arrival hace 3h (dentro de ventana)
    booking_id = await _seed_confirmed_booking(
        session_factory, departure_at=_NOW - timedelta(hours=20)
    )

    # act
    with patch.object(reminders, "AsyncSessionLocal", session_factory):
        await reminders.send_feedback_job()

    # assert: feedback_sent pasó a True
    async with session_factory() as db:
        booking = await db.get(Booking, booking_id)
        assert booking.feedback_sent is True


async def test_send_feedback_job_no_toca_bookings_fuera_de_ventana(session_factory):
    # arrange: confirmed, feedback_sent=False, departure hace 18h → arrival hace 1h (fuera de ventana)
    booking_id = await _seed_confirmed_booking(
        session_factory, departure_at=_NOW - timedelta(hours=18)
    )

    # act
    with patch.object(reminders, "AsyncSessionLocal", session_factory):
        await reminders.send_feedback_job()

    # assert: feedback_sent sigue en False
    async with session_factory() as db:
        booking = await db.get(Booking, booking_id)
        assert booking.feedback_sent is False


async def test_send_feedback_job_no_reenvía_si_ya_sent(session_factory):
    # arrange: confirmed, departure hace 20h → arrival hace 3h; marcar feedback_sent=True antes del job
    booking_id = await _seed_confirmed_booking(
        session_factory, departure_at=_NOW - timedelta(hours=20)
    )
    async with session_factory() as db:
        booking = await db.get(Booking, booking_id)
        booking.feedback_sent = True
        await db.commit()

    # act
    with patch.object(reminders, "AsyncSessionLocal", session_factory):
        with patch("tasks.reminders.send_feedback_email") as mock_send:
            await reminders.send_feedback_job()

    # assert: send_feedback_email no fue llamada
    mock_send.assert_not_called()
