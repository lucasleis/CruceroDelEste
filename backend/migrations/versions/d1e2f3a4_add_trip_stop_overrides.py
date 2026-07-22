"""add trip_stop_overrides table

Revision ID: d1e2f3a4
Revises: c3d4e5f6
Create Date: 2026-07-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "d1e2f3a4"
down_revision = "c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trip_stop_overrides",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("trip_id", UUID(as_uuid=True), sa.ForeignKey("trips.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stop_id", UUID(as_uuid=True), sa.ForeignKey("stops.id"), nullable=False),
        sa.Column("order", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("trip_id", "order", name="uq_trip_stop_overrides_trip_order"),
        sa.UniqueConstraint("trip_id", "stop_id", name="uq_trip_stop_overrides_trip_stop"),
    )
    op.create_index("idx_trip_stop_overrides_trip_id", "trip_stop_overrides", ["trip_id", "order"])

    op.create_index(
        "idx_bookings_mp_payment_id",
        "bookings",
        ["mp_payment_id"],
        postgresql_where=sa.text("mp_payment_id IS NOT NULL"),
    )
    op.create_index(
        "idx_bookings_pending_reminder",
        "bookings",
        ["trip_id"],
        postgresql_where=sa.text("status = 'confirmed' AND reminder_sent = false"),
    )
    op.create_index(
        "idx_bookings_pending_feedback",
        "bookings",
        ["trip_id"],
        postgresql_where=sa.text("status = 'confirmed' AND feedback_sent = false"),
    )
    op.create_index(
        "idx_routes_destination_stop",
        "routes",
        ["destination_stop_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_routes_destination_stop", table_name="routes")
    op.drop_index("idx_bookings_pending_feedback", table_name="bookings")
    op.drop_index("idx_bookings_pending_reminder", table_name="bookings")
    op.drop_index("idx_bookings_mp_payment_id", table_name="bookings")
    op.drop_index("idx_trip_stop_overrides_trip_id", table_name="trip_stop_overrides")
    op.drop_table("trip_stop_overrides")
