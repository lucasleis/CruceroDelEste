"""add missing indexes on Trip(status, departure_at) and Trip.route_id

Revision ID: f3a9c7d5
Revises: a3d5e8f1, b7c3a1d2
Create Date: 2026-06-24

"""
from alembic import op

revision = "f3a9c7d5"
down_revision = ("a3d5e8f1", "b7c3a1d2")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("idx_trips_status_departure_at", "trips", ["status", "departure_at"])
    op.create_index("idx_trips_route_id", "trips", ["route_id"])


def downgrade() -> None:
    op.drop_index("idx_trips_route_id", table_name="trips")
    op.drop_index("idx_trips_status_departure_at", table_name="trips")
