"""add refunded status and refund_requests table

Revision ID: c9d4e2f1
Revises: 6a04bf7f
Create Date: 2026-06-14

"""
from alembic import op
import sqlalchemy as sa

revision = "c9d4e2f1"
down_revision = "6a04bf7f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Safe in Postgres 12+ inside a transaction block; IF NOT EXISTS makes it idempotent.
    op.execute("ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'refunded'")

    op.create_table(
        "refund_requests",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("booking_id", sa.UUID(), nullable=False),
        sa.Column(
            "requested_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("email_used", sa.String(255), nullable=False),
        sa.Column("window_valid", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_refund_requests_booking", "refund_requests", ["booking_id"])


def downgrade() -> None:
    op.drop_index("idx_refund_requests_booking", table_name="refund_requests")
    op.drop_table("refund_requests")
    # 'refunded' cannot be dropped from the booking_status ENUM in PostgreSQL.
    # A full rollback requires recreating the type excluding this value.
