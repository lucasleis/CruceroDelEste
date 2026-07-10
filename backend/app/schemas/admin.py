from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.booking import BookingStatusEnum, ChargebackStatusEnum
from app.models.trip import CountryEnum, SeatStatusEnum, SeatTypeEnum, TripStatusEnum
from app.schemas.bookings import PassengerRead
from app.schemas.trips import RouteRead


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class PriceTrancheCreate(BaseModel):
    seat_type: SeatTypeEnum
    min_sold: int = Field(ge=0)
    max_sold: int
    price: int = Field(gt=0)

    @model_validator(mode="after")
    def _max_sold_greater_than_min(self) -> "PriceTrancheCreate":
        if self.max_sold <= self.min_sold:
            raise ValueError("max_sold must be greater than min_sold")
        return self


class PriceTrancheRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    seat_type: SeatTypeEnum
    min_sold: int
    max_sold: int
    price: int
    created_at: datetime


class SeatLayoutRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    total_cama: int
    total_semi_cama: int
    description: str | None


class StopCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    country: CountryEnum
    province: str | None = Field(default=None, max_length=100)


class StopUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    country: CountryEnum | None = None
    province: str | None = Field(default=None, max_length=100)


class RouteCreate(BaseModel):
    origin_stop_id: UUID
    destination_stop_id: UUID


class RouteStopRead(BaseModel):
    order: int
    stop_id: UUID
    name: str
    country: str


class TripCreate(BaseModel):
    route_id: UUID
    departure_at: datetime
    arrival_at: datetime
    seat_layout_id: UUID


class TripUpdate(BaseModel):
    departure_at: datetime | None = None
    arrival_at: datetime | None = None
    status: TripStatusEnum | None = None


class TrancheCoverage(BaseModel):
    is_complete: bool
    first_gap: int | None  # first uncovered seat number, None if complete
    total: int  # total seats of this type in the layout


class PriceTrancheSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    cama: TrancheCoverage
    semi_cama: TrancheCoverage


class AdminTripRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    route: RouteRead
    departure_at: datetime
    arrival_at: datetime
    status: TripStatusEnum
    seat_layout_id: UUID | None
    created_at: datetime
    price_tranches_summary: PriceTrancheSummary


class AdminSeatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    seat_number: str
    seat_type: SeatTypeEnum
    status: SeatStatusEnum


class AdminSeatStatusUpdate(BaseModel):
    status: Literal["blocked", "available"]


class ChargebackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    booking_id: UUID
    mp_payment_id: str
    mp_chargeback_id: str | None
    status: ChargebackStatusEnum
    status_detail: str | None
    date_documentation_deadline: datetime | None
    created_at: datetime
    updated_at: datetime


class AdminBookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    status: BookingStatusEnum
    contact_email: str
    total_amount: int
    mp_preference_id: str | None
    mp_payment_id: str | None
    expires_at: datetime
    confirmed_at: datetime | None
    reminder_sent: bool
    feedback_sent: bool
    created_at: datetime
    passengers: list[PassengerRead]
