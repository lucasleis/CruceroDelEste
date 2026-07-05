"""add province to stops

Revision ID: a1c8e6b4
Revises: b5e3a9f8
Create Date: 2026-07-05

"""
from alembic import op
import sqlalchemy as sa


revision = "a1c8e6b4"
down_revision = "b5e3a9f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("stops", sa.Column("province", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("stops", "province")
