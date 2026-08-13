"""set not null on routes stop foreign keys

Revision ID: 102018def900
Revises: e8c0a408671b
Create Date: 2026-08-13 17:51:32.685265

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '102018def900'
down_revision: Union[str, Sequence[str], None] = 'e8c0a408671b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # b7c3a1d2 dejó origin_stop_id y destination_stop_id nullable para
    # permitir el backfill de filas existentes, pero nunca aplicó el
    # SET NOT NULL final (ver LLE-378). Guarda previa: un SET NOT NULL
    # sobre una fila huérfana falla con un error de constraint de Postgres
    # que no explica el problema de negocio (la regla AR↔PY no puede
    # evaluarse sin origen y destino).
    conn = op.get_bind()
    huerfanas = conn.execute(sa.text(
        "SELECT count(*) FROM routes "
        "WHERE origin_stop_id IS NULL OR destination_stop_id IS NULL"
    )).scalar()
    if huerfanas:
        raise RuntimeError(
            f"{huerfanas} fila(s) en routes tienen origin_stop_id o "
            "destination_stop_id en NULL. Hay que resolverlas antes de "
            "aplicar NOT NULL — ver LLE-378."
        )

    op.alter_column("routes", "origin_stop_id", nullable=False)
    op.alter_column("routes", "destination_stop_id", nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column("routes", "origin_stop_id", nullable=True)
    op.alter_column("routes", "destination_stop_id", nullable=True)
