from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.trip import SeatStatusEnum, SeatTypeEnum, TripStatusEnum


class RouteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    origin: str
    destination: str


class SeatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    seat_number: str
    seat_type: SeatTypeEnum
    status: SeatStatusEnum


class TripRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    route: RouteRead
    departure_at: datetime
    arrival_at: datetime
    status: TripStatusEnum
    available_seats_count: int
    current_price_cama: int | None
    current_price_semi_cama: int | None
