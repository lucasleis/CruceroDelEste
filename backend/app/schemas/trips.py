from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.trip import CountryEnum, SeatStatusEnum, SeatTypeEnum, TripStatusEnum


class StopRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    country: CountryEnum
    province: str | None = None


class RouteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    origin_stop: StopRead
    destination_stop: StopRead


class SeatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    seat_number: str
    seat_type: SeatTypeEnum
    status: SeatStatusEnum


class TripRead(BaseModel):
    """
    Contrato para el caller: available_seats_count, current_price_cama y
    current_price_semi_cama NO existen en el modelo ORM Trip. El router o service
    DEBE poblarlos manualmente antes de construir este schema. De lo contrario
    Pydantic lanza ValidationError en runtime.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    route: RouteRead
    departure_at: datetime
    arrival_at: datetime
    status: TripStatusEnum
    available_seats_count: int
    current_price_cama: int | None
    current_price_semi_cama: int | None
    # None en list_trips (no se calcula ahí, sin consumidor hoy); valor real
    # sólo en get_trip. No asumir True por default.
    seat_layout_supported: bool | None = None
