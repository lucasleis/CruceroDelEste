from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models.booking import BookingStatusEnum
from app.models.trip import SeatTypeEnum
from app.schemas.bookings import PassengerRead


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


class AdminBookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    status: BookingStatusEnum
    total_amount: int
    mp_preference_id: str | None
    mp_payment_id: str | None
    expires_at: datetime
    confirmed_at: datetime | None
    reminder_sent: bool
    feedback_sent: bool
    created_at: datetime
    passengers: list[PassengerRead]
