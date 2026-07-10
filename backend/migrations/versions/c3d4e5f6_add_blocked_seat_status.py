"""add blocked status to seat_status enum

Revision ID: c3d4e5f6
Revises: b2c3d4e5
Create Date: 2026-07-10

"""
from alembic import op

revision = "c3d4e5f6"
down_revision = "b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE seat_status ADD VALUE IF NOT EXISTS 'blocked'")


def downgrade() -> None:
    pass  # Cannot remove enum values in PostgreSQL without recreating the type
