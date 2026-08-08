"""add booking_code to bookings

Revision ID: e2f4a8c6
Revises: d1e2f3a4
Create Date: 2026-08-08

"""
import secrets

from alembic import op
import sqlalchemy as sa

revision = "e2f4a8c6"
down_revision = "d1e2f3a4"
branch_labels = None
depends_on = None

# Kept in sync by hand with app/services/booking_code.py — migrations must
# not import application code (it can change or disappear after this
# migration is history), so the generation logic is duplicated here
# deliberately, not imported.
_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
_GROUP_LENGTH = 4
_GROUP_COUNT = 2


def _generate_code() -> str:
    groups = [
        "".join(secrets.choice(_ALPHABET) for _ in range(_GROUP_LENGTH))
        for _ in range(_GROUP_COUNT)
    ]
    return f"ERP-{'-'.join(groups)}"


def upgrade() -> None:
    # Step 1: add nullable so existing rows can be backfilled first.
    op.add_column("bookings", sa.Column("booking_code", sa.String(13), nullable=True))

    # Step 2: backfill existing rows. Each code is checked against every code
    # already assigned in this same backfill run (no two existing rows can
    # collide with each other) — the column has no unique constraint yet at
    # this point, so this Python-side set is the only thing preventing
    # duplicates during backfill itself. Row-by-row because the alphabet and
    # non-sequential requirement rule out a single SQL UPDATE.
    conn = op.get_bind()
    existing_ids = conn.execute(sa.text("SELECT id FROM bookings")).fetchall()

    used_codes: set[str] = set()
    for (booking_id,) in existing_ids:
        code = _generate_code()
        while code in used_codes:
            code = _generate_code()
        used_codes.add(code)
        conn.execute(
            sa.text("UPDATE bookings SET booking_code = :code WHERE id = :id"),
            {"code": code, "id": booking_id},
        )

    # Step 3: enforce NOT NULL + unique now that every row has a value.
    op.alter_column("bookings", "booking_code", nullable=False)
    op.create_unique_constraint("uq_bookings_booking_code", "bookings", ["booking_code"])


def downgrade() -> None:
    op.drop_constraint("uq_bookings_booking_code", "bookings", type_="unique")
    op.drop_column("bookings", "booking_code")
