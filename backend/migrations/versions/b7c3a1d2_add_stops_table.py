"""add stops table and refactor routes to reference stops

Revision ID: b7c3a1d2
Revises: c9d4e2f1
Create Date: 2026-06-23

"""
from alembic import op
import sqlalchemy as sa

revision = "b7c3a1d2"
down_revision = "c9d4e2f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE country_code AS ENUM ('AR', 'PY')")

    op.create_table(
        "stops",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("country", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.execute("ALTER TABLE stops ALTER COLUMN country TYPE country_code USING country::country_code")

    # Add FK columns to routes as nullable; NOT NULL is enforced by the ORM.
    # The routes table has no production data at the time of this migration.
    op.add_column("routes", sa.Column("origin_stop_id", sa.UUID(), nullable=True))
    op.add_column("routes", sa.Column("destination_stop_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_routes_origin_stop", "routes", "stops", ["origin_stop_id"], ["id"]
    )
    op.create_foreign_key(
        "fk_routes_destination_stop", "routes", "stops", ["destination_stop_id"], ["id"]
    )

    # Drop old string columns and their unique constraint.
    op.drop_constraint("routes_origin_destination_key", "routes", type_="unique")
    op.drop_column("routes", "origin")
    op.drop_column("routes", "destination")

    op.create_unique_constraint(
        "uq_routes_stops", "routes", ["origin_stop_id", "destination_stop_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_routes_stops", "routes", type_="unique")

    op.drop_constraint("fk_routes_destination_stop", "routes", type_="foreignkey")
    op.drop_constraint("fk_routes_origin_stop", "routes", type_="foreignkey")
    op.drop_column("routes", "destination_stop_id")
    op.drop_column("routes", "origin_stop_id")

    op.add_column("routes", sa.Column("origin", sa.String(100), nullable=True))
    op.add_column("routes", sa.Column("destination", sa.String(100), nullable=True))
    op.create_unique_constraint(
        "routes_origin_destination_key", "routes", ["origin", "destination"]
    )

    op.drop_table("stops")
    op.execute("DROP TYPE country_code")
