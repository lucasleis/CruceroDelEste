# Seat-level vs booking-level expiration:
#   seats.reserved_at  — source of truth for when a seat reservation expires.
#                        Set when the seat is reserved; cleared on confirm or expire.
#   bookings.expires_at — derived from reserved_at at booking creation time
#                         (now + booking_expiry_minutes). Used for booking-level
#                         queries (e.g. finding overdue bookings). Both fields
#                         MUST stay in sync: whenever seats are released, the
#                         booking status must also be set to expired, and vice versa.

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.booking import Booking, BookingStatusEnum, Passenger, RefundRequest
from app.models.trip import CountryEnum, Seat, SeatStatusEnum, SeatTypeEnum
from app.services.inventory import mark_seats_sold, reserve_seats
from app.services.payment import PreferenceItem
from app.services.pricing import get_current_price


class InternationalRouteRequiredError(Exception):
    pass


_SEAT_TYPE_TITLES: dict[SeatTypeEnum, str] = {
    SeatTypeEnum.cama: "Pasaje Cama",
    SeatTypeEnum.semi_cama: "Pasaje Semi Cama",
}
assert set(_SEAT_TYPE_TITLES) == set(SeatTypeEnum), (
    f"_SEAT_TYPE_TITLES no cubre todos los SeatTypeEnum: "
    f"faltan {set(SeatTypeEnum) - set(_SEAT_TYPE_TITLES)}"
)


@dataclass
class PassengerData:
    seat_id: UUID
    first_name: str
    last_name: str
    dni: str
    email: str
    phone: str | None = None


async def create_booking(
    db: AsyncSession,
    trip_id: UUID,
    seat_ids: list[UUID],
    passengers_data: list[PassengerData],
    origin_country: CountryEnum,
    destination_country: CountryEnum,
    contact_email: str,
) -> tuple[Booking, list[PreferenceItem]]:
    if origin_country == destination_country:
        raise InternationalRouteRequiredError()

    provided = {p.seat_id for p in passengers_data}
    missing = set(seat_ids) - provided
    if missing:
        raise ValueError(f"Missing passenger data for seat(s): {missing}")

    seats = await reserve_seats(db, seat_ids, trip_id)
    total_amount, items = await _calculate_total_and_items(db, trip_id, seats)

    # Integrity check: items must sum to exactly total_amount.
    # Both are derived from the same data in the same transaction, so a mismatch
    # indicates a programming error — fail loudly before persisting anything.
    computed = sum(item.unit_price * item.quantity for item in items)
    if computed != total_amount:
        raise ValueError(
            f"total_amount mismatch: booking total={total_amount}, items sum={computed}"
        )

    now = datetime.now(timezone.utc)
    booking = Booking(
        trip_id=trip_id,
        status=BookingStatusEnum.pending_payment,
        contact_email=contact_email,
        total_amount=total_amount,
        expires_at=now + timedelta(minutes=settings.booking_expiry_minutes),
    )
    db.add(booking)
    await db.flush()  # populate booking.id before creating passengers

    passenger_by_seat = {p.seat_id: p for p in passengers_data}
    for seat in seats:
        data = passenger_by_seat[seat.id]
        db.add(Passenger(
            booking_id=booking.id,
            seat_id=seat.id,
            first_name=data.first_name,
            last_name=data.last_name,
            dni=data.dni,
            email=data.email,
            phone=data.phone,
        ))

    return booking, items


async def confirm_booking(
    db: AsyncSession,
    booking_id: UUID,
    mp_payment_id: str,
) -> Booking:
    booking = await _get_booking(db, booking_id)

    if booking.status != BookingStatusEnum.pending_payment:
        return booking

    seat_ids = await _seat_ids_for_booking(db, booking_id)
    await mark_seats_sold(db, seat_ids)

    booking.status = BookingStatusEnum.confirmed
    booking.mp_payment_id = mp_payment_id
    booking.confirmed_at = datetime.now(timezone.utc)

    return booking


async def expire_booking(db: AsyncSession, booking_id: UUID) -> Booking:
    booking = await _get_booking(db, booking_id)

    if booking.status != BookingStatusEnum.pending_payment:
        return booking

    seat_ids = await _seat_ids_for_booking(db, booking_id)
    await _release_booking_seats(db, seat_ids)

    booking.status = BookingStatusEnum.expired

    return booking


# --- helpers -----------------------------------------------------------------

async def _calculate_total_and_items(
    db: AsyncSession,
    trip_id: UUID,
    seats: list[Seat],
) -> tuple[int, list[PreferenceItem]]:
    # Group seats by type, then price each group at the current tranche.
    # get_current_price reflects sold count before this reservation, which is
    # correct: tranches are evaluated at the moment of purchase.
    by_type: dict[SeatTypeEnum, int] = {}
    for seat in seats:
        by_type[seat.seat_type] = by_type.get(seat.seat_type, 0) + 1

    total = 0
    items: list[PreferenceItem] = []
    for seat_type, count in by_type.items():
        unit_price = await get_current_price(db, trip_id, seat_type)
        total += unit_price * count
        items.append(
            PreferenceItem(
                title=_SEAT_TYPE_TITLES[seat_type],
                quantity=count,
                unit_price=unit_price,
            )
        )

    return total, items


async def _get_booking(db: AsyncSession, booking_id: UUID) -> Booking:
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id).with_for_update()
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise BookingNotFound(booking_id)
    return booking


async def _seat_ids_for_booking(db: AsyncSession, booking_id: UUID) -> list[UUID]:
    result = await db.execute(
        select(Passenger.seat_id).where(Passenger.booking_id == booking_id)
    )
    return list(result.scalars().all())


async def _release_booking_seats(db: AsyncSession, seat_ids: list[UUID]) -> None:
    result = await db.execute(
        select(Seat).where(Seat.id.in_(seat_ids)).with_for_update()
    )
    for seat in result.scalars().all():
        seat.status = SeatStatusEnum.available
        seat.reserved_at = None


async def create_refund_request(
    db: AsyncSession,
    booking_id: UUID,
    email_used: str,
    window_valid: bool,
) -> RefundRequest:
    refund_request = RefundRequest(
        booking_id=booking_id,
        email_used=email_used,
        window_valid=window_valid,
    )
    db.add(refund_request)
    await db.flush()
    return refund_request


async def mark_booking_refunded(db: AsyncSession, booking_id: UUID) -> Booking:
    booking = await _get_booking(db, booking_id)
    if booking.status != BookingStatusEnum.confirmed:
        return booking
    booking.status = BookingStatusEnum.refunded
    return booking


class BookingNotFound(Exception):
    def __init__(self, booking_id: UUID) -> None:
        self.booking_id = booking_id
        super().__init__(f"Booking {booking_id} not found")
