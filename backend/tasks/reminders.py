import logging
from datetime import datetime, timedelta, timezone

from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.booking import Booking, BookingStatusEnum, Passenger
from app.models.trip import Route, Trip
from app.services.booking import expire_booking
from app.services.email import send_feedback_email, send_reminder_email

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(
    jobstores={"default": SQLAlchemyJobStore(url=settings.sync_database_url)},
)


def register_jobs() -> None:
    scheduler.add_job(
        expire_bookings_job,
        trigger=IntervalTrigger(minutes=1),
        id="expire_bookings",
        replace_existing=True,
        misfire_grace_time=60,
    )
    scheduler.add_job(
        send_reminders_job,
        trigger=IntervalTrigger(hours=1),
        id="send_reminders",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        send_feedback_job,
        trigger=IntervalTrigger(hours=1),
        id="send_feedback",
        replace_existing=True,
        misfire_grace_time=3600,
    )




async def expire_bookings_job() -> None:
    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Booking).where(
                Booking.status == BookingStatusEnum.pending_payment,
                Booking.expires_at <= now,
            )
        )
        bookings = list(result.scalars().all())

    for booking in bookings:
        async with AsyncSessionLocal() as db:
            try:
                await expire_booking(db, booking.id)
                await db.commit()
            except Exception:
                logger.error(
                    "expire_bookings_job failed booking_id=%s",
                    booking.id,
                    exc_info=True,
                )
                await db.rollback()


async def send_reminders_job() -> None:
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(hours=24)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Booking.id)
            .join(Trip, Booking.trip_id == Trip.id)
            .where(
                Booking.status == BookingStatusEnum.confirmed,
                Booking.reminder_sent.is_(False),
                Trip.departure_at >= now,
                Trip.departure_at <= window_end,
            )
        )
        booking_ids = list(result.scalars().all())

    for booking_id in booking_ids:
        async with AsyncSessionLocal() as db:
            try:
                result = await db.execute(
                    select(Booking)
                    .where(Booking.id == booking_id)
                    .options(
                        selectinload(Booking.passengers).selectinload(Passenger.seat),
                        selectinload(Booking.trip).selectinload(Trip.route).selectinload(Route.origin_stop),
                        selectinload(Booking.trip).selectinload(Trip.route).selectinload(Route.destination_stop),
                    )
                )
                db_booking = result.scalar_one()
                await send_reminder_email(db_booking)
                db_booking.reminder_sent = True
                await db.commit()
            except Exception:
                logger.error(
                    "send_reminders_job failed booking_id=%s",
                    booking_id,
                    exc_info=True,
                )
                await db.rollback()


async def send_feedback_job() -> None:
    now = datetime.now(timezone.utc)
    feedback_cutoff = now - timedelta(hours=2)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Booking.id)
            .join(Trip, Booking.trip_id == Trip.id)
            .where(
                Booking.status == BookingStatusEnum.confirmed,
                Booking.feedback_sent.is_(False),
                Trip.arrival_at <= feedback_cutoff,
            )
        )
        booking_ids = list(result.scalars().all())

    for booking_id in booking_ids:
        async with AsyncSessionLocal() as db:
            try:
                result = await db.execute(
                    select(Booking)
                    .where(Booking.id == booking_id)
                    .options(
                        selectinload(Booking.passengers).selectinload(Passenger.seat),
                        selectinload(Booking.trip).selectinload(Trip.route).selectinload(Route.origin_stop),
                        selectinload(Booking.trip).selectinload(Trip.route).selectinload(Route.destination_stop),
                    )
                )
                db_booking = result.scalar_one()
                await send_feedback_email(db_booking)
                db_booking.feedback_sent = True
                await db.commit()
            except Exception:
                logger.error(
                    "send_feedback_job failed booking_id=%s",
                    booking_id,
                    exc_info=True,
                )
                await db.rollback()
