"""add seat_layout_seats table

Revision ID: b2c3d4e5
Revises: a1b2c3d4
Create Date: 2026-07-10

"""
from alembic import op
import sqlalchemy as sa

revision = "b2c3d4e5"
down_revision = "a1b2c3d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "seat_layout_seats",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("seat_layout_id", sa.UUID(), nullable=False),
        sa.Column("seat_number", sa.String(4), nullable=False),
        sa.Column("seat_type", sa.Text(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["seat_layout_id"], ["seat_layouts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("seat_layout_id", "seat_number", name="uq_seat_layout_seats_number"),
    )
    op.create_index("idx_seat_layout_seats_layout", "seat_layout_seats", ["seat_layout_id", "display_order"])
    op.execute("ALTER TABLE seat_layout_seats ALTER COLUMN seat_type TYPE seat_type USING seat_type::seat_type")


def downgrade() -> None:
    op.drop_index("idx_seat_layout_seats_layout", table_name="seat_layout_seats")
    op.drop_table("seat_layout_seats")
