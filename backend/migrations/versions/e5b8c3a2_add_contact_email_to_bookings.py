"""add contact_email to bookings

Revision ID: e5b8c3a2
Revises: f3a9c7d5
Create Date: 2026-06-24

"""
from alembic import op
import sqlalchemy as sa

revision = "e5b8c3a2"
down_revision = "f3a9c7d5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: add nullable so existing rows can be backfilled first.
    op.add_column("bookings", sa.Column("contact_email", sa.String(255), nullable=True))

    # Step 2: backfill from any passenger belonging to each booking.
    # Every booking must have at least one passenger (enforced at creation time),
    # so no row should remain NULL after this UPDATE.
    op.execute(
        """
        UPDATE bookings
        SET contact_email = (
            SELECT email
            FROM passengers
            WHERE booking_id = bookings.id
            LIMIT 1
        )
        """
    )

    # Step 3: enforce NOT NULL now that all rows have a value.
    op.alter_column("bookings", "contact_email", nullable=False)


def downgrade() -> None:
    op.drop_column("bookings", "contact_email")
