"""add chargebacks table

Revision ID: b5e3a9f8
Revises: d4b1f9e2
Create Date: 2026-06-25

"""
from alembic import op
import sqlalchemy as sa

revision = "b5e3a9f8"
down_revision = "d4b1f9e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # op.execute("CREATE TYPE chargeback_status AS ENUM ('in_process', 'settled', 'reimbursed')")

    op.create_table(
        "chargebacks",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("booking_id", sa.UUID(), nullable=False),
        sa.Column("mp_payment_id", sa.String(255), nullable=False),
        sa.Column("mp_chargeback_id", sa.String(255), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "in_process", "settled", "reimbursed",
                name="chargeback_status",
                create_type=True,
            ),
            nullable=False,
        ),
        sa.Column("status_detail", sa.String(255), nullable=True),
        sa.Column("date_documentation_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("idx_chargebacks_booking", "chargebacks", ["booking_id"])

    # Partial unique index: guarantees uniqueness only when mp_chargeback_id is known.
    # Allows multiple rows without a chargeback_id (e.g. during initial webhook delivery).
    op.execute(
        "CREATE UNIQUE INDEX idx_chargebacks_mp_chargeback_id "
        "ON chargebacks (mp_chargeback_id) WHERE mp_chargeback_id IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_chargebacks_mp_chargeback_id")
    op.drop_index("idx_chargebacks_booking", table_name="chargebacks")
    op.drop_table("chargebacks")
    op.execute("DROP TYPE chargeback_status")
