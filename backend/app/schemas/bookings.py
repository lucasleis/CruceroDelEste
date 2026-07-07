from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.booking import BookingStatusEnum
from app.models.trip import TripStatusEnum
from app.schemas.trips import RouteRead


class PassengerCreate(BaseModel):
    seat_id: UUID
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    dni: str = Field(min_length=1, max_length=20)
    email: EmailStr = Field(max_length=255)
    phone: str | None = Field(default=None, max_length=30)
    luggage_count: int = Field(default=0, ge=0)


class PassengerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    seat_id: UUID
    first_name: str
    last_name: str
    dni: str
    email: EmailStr
    phone: str | None
    luggage_count: int


class BookingCreate(BaseModel):
    trip_id: UUID
    contact_email: EmailStr = Field(max_length=255)
    seat_ids: list[UUID] = Field(min_length=1)
    passengers: list[PassengerCreate] = Field(min_length=1)

    @model_validator(mode="after")
    def _passengers_match_seats(self) -> "BookingCreate":
        if len(set(self.seat_ids)) != len(self.seat_ids):
            raise ValueError("seat_ids contains duplicates")

        passenger_seats = [p.seat_id for p in self.passengers]
        if len(set(passenger_seats)) != len(passenger_seats):
            raise ValueError("passengers contains duplicate seat_id")

        if set(self.seat_ids) != set(passenger_seats):
            raise ValueError("seat_ids and passengers.seat_id must match exactly")

        return self


class TripSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    route: RouteRead
    departure_at: datetime
    arrival_at: datetime
    status: TripStatusEnum


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    status: BookingStatusEnum
    contact_email: str
    total_amount: int
    expires_at: datetime
    confirmed_at: datetime | None
    trip: TripSummary
    passengers: list[PassengerRead]


class RefundRequestCreate(BaseModel):
    email: EmailStr


class RefundRequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    booking_id: UUID
    requested_at: datetime
    email_used: str
    window_valid: bool


class BookingCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    status: BookingStatusEnum
    contact_email: str
    total_amount: int
    expires_at: datetime
    passengers: list[PassengerRead]
    init_point: str
