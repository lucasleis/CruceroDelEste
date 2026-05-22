import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
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


class BookingStatusEnum(str, enum.Enum):
    pending_payment = "pending_payment"
    confirmed = "confirmed"
    expired = "expired"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=False)
    status = Column(
        Enum(BookingStatusEnum, name="booking_status"),
        nullable=False,
        default=BookingStatusEnum.pending_payment,
    )
    mp_preference_id = Column(String(255), nullable=True)
    mp_payment_id = Column(String(255), nullable=True)
    total_amount = Column(Integer, nullable=False)
    # seats.reserved_at (seat-level) and bookings.expires_at (booking-level) MUST stay in sync.
    # reserved_at is the source of truth for individual seat expiration;
    # expires_at is derived from it and used for booking-level expiration queries.
    expires_at = Column(DateTime(timezone=True), nullable=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    reminder_sent = Column(Boolean, nullable=False, default=False)
    feedback_sent = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("total_amount > 0", name="ck_bookings_total_amount"),
        Index("idx_bookings_trip", "trip_id"),
        Index("idx_bookings_status", "status"),
        Index(
            "idx_bookings_expires",
            "expires_at",
            postgresql_where=Column("status") == "pending_payment",
        ),
    )

    trip = relationship("Trip", back_populates="bookings")
    passengers = relationship("Passenger", back_populates="booking")


class Passenger(Base):
    __tablename__ = "passengers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    seat_id = Column(UUID(as_uuid=True), ForeignKey("seats.id"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    dni = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(30), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("seat_id"),
        Index("idx_passengers_booking", "booking_id"),
        Index("idx_passengers_email", "email"),
    )

    booking = relationship("Booking", back_populates="passengers")
    seat = relationship("Seat", back_populates="passenger")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
