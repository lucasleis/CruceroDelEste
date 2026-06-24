"""add seat_layouts table and seat_layout_id FK to trips

Revision ID: d4b1f9e2
Revises: e5b8c3a2
Create Date: 2026-06-24

"""
from alembic import op
import sqlalchemy as sa

revision = "d4b1f9e2"
down_revision = "e5b8c3a2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "seat_layouts",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("total_cama", sa.Integer, nullable=False),
        sa.Column("total_semi_cama", sa.Integer, nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_seat_layouts_name"),
        sa.CheckConstraint("total_cama > 0", name="ck_seat_layouts_total_cama"),
        sa.CheckConstraint("total_semi_cama >= 0", name="ck_seat_layouts_total_semi_cama"),
    )

    op.add_column(
        "trips",
        sa.Column("seat_layout_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_trips_seat_layout_id",
        "trips",
        "seat_layouts",
        ["seat_layout_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_trips_seat_layout_id", "trips", type_="foreignkey")
    op.drop_column("trips", "seat_layout_id")
    op.drop_table("seat_layouts")
