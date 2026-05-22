import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base

import enum


class SeatTypeEnum(str, enum.Enum):
    cama = "cama"
    semi_cama = "semi_cama"


class SeatStatusEnum(str, enum.Enum):
    available = "available"
    reserved = "reserved"
    sold = "sold"


class TripStatusEnum(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class Route(Base):
    __tablename__ = "routes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    origin = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (UniqueConstraint("origin", "destination"),)

    trips = relationship("Trip", back_populates="route")


class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    route_id = Column(UUID(as_uuid=True), ForeignKey("routes.id"), nullable=False)
    departure_at = Column(DateTime(timezone=True), nullable=False)
    arrival_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        Enum(TripStatusEnum, name="trip_status"),
        nullable=False,
        default=TripStatusEnum.scheduled,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    route = relationship("Route", back_populates="trips")
    seats = relationship("Seat", back_populates="trip")
    price_tranches = relationship("PriceTranche", back_populates="trip")
    bookings = relationship("Booking", back_populates="trip")


class Seat(Base):
    __tablename__ = "seats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False)
    seat_number = Column(String(4), nullable=False)
    seat_type = Column(Enum(SeatTypeEnum, name="seat_type"), nullable=False)
    status = Column(
        Enum(SeatStatusEnum, name="seat_status"),
        nullable=False,
        default=SeatStatusEnum.available,
    )
    reserved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("trip_id", "seat_number"),
        Index("idx_seats_trip_status", "trip_id", "status"),
        Index(
            "idx_seats_reserved_at",
            "reserved_at",
            postgresql_where=Column("status") == "reserved",
        ),
    )

    trip = relationship("Trip", back_populates="seats")
    passenger = relationship("Passenger", back_populates="seat", uselist=False)


class PriceTranche(Base):
    __tablename__ = "price_tranches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False)
    seat_type = Column(Enum(SeatTypeEnum, name="seat_type"), nullable=False)
    min_sold = Column(Integer, nullable=False)
    max_sold = Column(Integer, nullable=False)
    price = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("min_sold >= 0", name="ck_price_tranches_min_sold"),
        CheckConstraint("max_sold > min_sold", name="ck_price_tranches_max_sold"),
        CheckConstraint("price > 0", name="ck_price_tranches_price"),
        UniqueConstraint("trip_id", "seat_type", "min_sold"),
        Index("idx_price_tranches_trip_type", "trip_id", "seat_type"),
    )

    trip = relationship("Trip", back_populates="price_tranches")
