"""add server defaults to trip_stop_overrides

Revision ID: e8c0a408671b
Revises: e2f4a8c6
Create Date: 2026-08-13 13:22:50.503413

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e8c0a408671b'
down_revision: Union[str, Sequence[str], None] = 'e2f4a8c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # trip_stop_overrides was the only table created without server_default on
    # id and created_at, breaking the invariant held by the other 13 tables.
    # Any INSERT that bypasses the ORM (seed scripts, raw SQL, fixtures) would
    # fail with "null value in column id violates not-null constraint".
    op.execute(
        "ALTER TABLE trip_stop_overrides "
        "ALTER COLUMN id SET DEFAULT gen_random_uuid()"
    )
    op.execute(
        "ALTER TABLE trip_stop_overrides "
        "ALTER COLUMN created_at SET DEFAULT now()"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE trip_stop_overrides ALTER COLUMN id DROP DEFAULT"
    )
    op.execute(
        "ALTER TABLE trip_stop_overrides ALTER COLUMN created_at DROP DEFAULT"
    )
