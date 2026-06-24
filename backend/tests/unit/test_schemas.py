"""Unit tests for BookingCreate and PriceTrancheCreate Pydantic validators.

No DB, no HTTP client, no mocks, no fixtures.
Tranche overlap is validated at the router layer, not at schema level — no test for it here.
"""

import uuid

import pytest
from pydantic import ValidationError

from app.models.trip import SeatTypeEnum
from app.schemas.admin import PriceTrancheCreate
from app.schemas.bookings import BookingCreate, PassengerCreate

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _passenger(seat_id: uuid.UUID, *, email: str = "passenger@example.com") -> dict:
    return {
        "seat_id": str(seat_id),
        "first_name": "Ana",
        "last_name": "García",
        "dni": "12345678",
        "email": email,
    }


def _booking(seat_ids: list[uuid.UUID], passengers: list[dict]) -> dict:
    return {
        "trip_id": str(uuid.uuid4()),
        "contact_email": "buyer@example.com",
        "seat_ids": [str(s) for s in seat_ids],
        "passengers": passengers,
    }


# ---------------------------------------------------------------------------
# BookingCreate — happy paths
# ---------------------------------------------------------------------------

def test_booking_create_valid_single_passenger():
    seat = uuid.uuid4()
    data = _booking([seat], [_passenger(seat)])
    bc = BookingCreate.model_validate(data)
    assert len(bc.passengers) == 1


def test_booking_create_valid_multiple_passengers():
    seats = [uuid.uuid4(), uuid.uuid4()]
    data = _booking(seats, [_passenger(seats[0]), _passenger(seats[1])])
    bc = BookingCreate.model_validate(data)
    assert len(bc.passengers) == 2


def test_booking_create_passengers_order_independent():
    # seat_ids and passengers.seat_id need to match as sets, not ordered lists.
    s1, s2 = uuid.uuid4(), uuid.uuid4()
    data = _booking([s1, s2], [_passenger(s2), _passenger(s1)])
    BookingCreate.model_validate(data)


# ---------------------------------------------------------------------------
# BookingCreate — missing required fields
# ---------------------------------------------------------------------------

def test_booking_create_missing_trip_id():
    seat = uuid.uuid4()
    data = {"seat_ids": [str(seat)], "passengers": [_passenger(seat)]}
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(data)


def test_booking_create_missing_seat_ids():
    seat = uuid.uuid4()
    data = {"trip_id": str(uuid.uuid4()), "passengers": [_passenger(seat)]}
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(data)


def test_booking_create_missing_passengers():
    seat = uuid.uuid4()
    data = {"trip_id": str(uuid.uuid4()), "seat_ids": [str(seat)]}
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(data)


# ---------------------------------------------------------------------------
# BookingCreate — invalid field values
# ---------------------------------------------------------------------------

def test_booking_create_empty_seat_ids_list():
    data = {"trip_id": str(uuid.uuid4()), "seat_ids": [], "passengers": []}
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(data)


def test_booking_create_empty_passengers_list():
    seat = uuid.uuid4()
    data = {"trip_id": str(uuid.uuid4()), "seat_ids": [str(seat)], "passengers": []}
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(data)


def test_booking_create_duplicate_seat_ids():
    seat = uuid.uuid4()
    data = _booking([seat, seat], [_passenger(seat)])
    with pytest.raises(ValidationError, match="seat_ids contains duplicates"):
        BookingCreate.model_validate(data)


def test_booking_create_duplicate_passenger_seat_id():
    seat = uuid.uuid4()
    data = _booking([seat], [_passenger(seat), _passenger(seat)])
    with pytest.raises(ValidationError, match="duplicate seat_id"):
        BookingCreate.model_validate(data)


def test_booking_create_seat_ids_passengers_mismatch_extra_seat():
    # seat_ids has a seat that no passenger covers.
    s1, s2 = uuid.uuid4(), uuid.uuid4()
    data = _booking([s1, s2], [_passenger(s1)])
    with pytest.raises(ValidationError, match="must match exactly"):
        BookingCreate.model_validate(data)


def test_booking_create_seat_ids_passengers_mismatch_extra_passenger():
    # Passenger references a seat not in seat_ids.
    s1, s2 = uuid.uuid4(), uuid.uuid4()
    data = _booking([s1], [_passenger(s1), _passenger(s2)])
    with pytest.raises(ValidationError, match="must match exactly"):
        BookingCreate.model_validate(data)


def test_booking_create_invalid_email():
    seat = uuid.uuid4()
    data = _booking([seat], [_passenger(seat, email="not-an-email")])
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(data)


def test_booking_create_empty_first_name():
    seat = uuid.uuid4()
    p = _passenger(seat)
    p["first_name"] = ""
    data = _booking([seat], [p])
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(data)


def test_booking_create_invalid_trip_id_format():
    seat = uuid.uuid4()
    data = _booking([seat], [_passenger(seat)])
    data["trip_id"] = "not-a-uuid"
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(data)


def test_booking_create_missing_contact_email():
    seat = uuid.uuid4()
    data = _booking([seat], [_passenger(seat)])
    del data["contact_email"]
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(data)


def test_booking_create_invalid_contact_email():
    seat = uuid.uuid4()
    data = _booking([seat], [_passenger(seat)])
    data["contact_email"] = "not-an-email"
    with pytest.raises(ValidationError):
        BookingCreate.model_validate(data)


# ---------------------------------------------------------------------------
# PriceTrancheCreate — happy paths
# ---------------------------------------------------------------------------

def test_tranche_create_valid_cama():
    t = PriceTrancheCreate(seat_type=SeatTypeEnum.cama, min_sold=0, max_sold=10, price=24500)
    assert t.price == 24500


def test_tranche_create_valid_semi_cama():
    t = PriceTrancheCreate(seat_type=SeatTypeEnum.semi_cama, min_sold=10, max_sold=20, price=23300)
    assert t.seat_type == SeatTypeEnum.semi_cama


def test_tranche_create_valid_string_seat_type():
    t = PriceTrancheCreate(seat_type="cama", min_sold=0, max_sold=5, price=1000)
    assert t.seat_type == SeatTypeEnum.cama


# ---------------------------------------------------------------------------
# PriceTrancheCreate — missing required fields
# ---------------------------------------------------------------------------

def test_tranche_create_missing_seat_type():
    with pytest.raises(ValidationError):
        PriceTrancheCreate(min_sold=0, max_sold=10, price=1000)


def test_tranche_create_missing_price():
    with pytest.raises(ValidationError):
        PriceTrancheCreate(seat_type=SeatTypeEnum.cama, min_sold=0, max_sold=10)


# ---------------------------------------------------------------------------
# PriceTrancheCreate — invalid field values
# ---------------------------------------------------------------------------

def test_tranche_create_negative_min_sold():
    with pytest.raises(ValidationError):
        PriceTrancheCreate(seat_type=SeatTypeEnum.cama, min_sold=-1, max_sold=10, price=1000)


def test_tranche_create_zero_price():
    with pytest.raises(ValidationError):
        PriceTrancheCreate(seat_type=SeatTypeEnum.cama, min_sold=0, max_sold=10, price=0)


def test_tranche_create_negative_price():
    with pytest.raises(ValidationError):
        PriceTrancheCreate(seat_type=SeatTypeEnum.cama, min_sold=0, max_sold=10, price=-500)


def test_tranche_create_max_sold_equal_to_min_sold():
    with pytest.raises(ValidationError, match="max_sold must be greater than min_sold"):
        PriceTrancheCreate(seat_type=SeatTypeEnum.cama, min_sold=5, max_sold=5, price=1000)


def test_tranche_create_max_sold_less_than_min_sold():
    with pytest.raises(ValidationError, match="max_sold must be greater than min_sold"):
        PriceTrancheCreate(seat_type=SeatTypeEnum.cama, min_sold=10, max_sold=5, price=1000)


def test_tranche_create_invalid_seat_type_string():
    with pytest.raises(ValidationError):
        PriceTrancheCreate(seat_type="executive", min_sold=0, max_sold=10, price=1000)
