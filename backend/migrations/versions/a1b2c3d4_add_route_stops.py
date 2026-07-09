"""add route_stops table

Revision ID: a1b2c3d4
Revises: e5b8c3a2, a1c8e6b4
Create Date: 2026-07-09

"""
from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4"
down_revision = ("e5b8c3a2", "a1c8e6b4")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "route_stops",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("route_id", sa.UUID(), nullable=False),
        sa.Column("stop_id", sa.UUID(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["route_id"], ["routes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["stop_id"], ["stops.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("route_id", "order", name="uq_route_stops_route_order"),
        sa.UniqueConstraint("route_id", "stop_id", name="uq_route_stops_route_stop"),
    )
    op.create_index("idx_route_stops_route_id", "route_stops", ["route_id", "order"])


def downgrade() -> None:
    op.drop_index("idx_route_stops_route_id", table_name="route_stops")
    op.drop_table("route_stops")
