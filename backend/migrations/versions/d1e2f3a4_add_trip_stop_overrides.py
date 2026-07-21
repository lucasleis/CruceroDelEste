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


def downgrade() -> None:
    op.drop_index("idx_trip_stop_overrides_trip_id")
    op.drop_table("trip_stop_overrides")
