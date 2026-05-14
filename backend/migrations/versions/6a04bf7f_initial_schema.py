"""initial schema

Revision ID: 6a04bf7f
Revises:
Create Date: 2026-05-13

"""
from alembic import op
import sqlalchemy as sa

revision = "6a04bf7f"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.execute("CREATE TYPE seat_type AS ENUM ('cama', 'semi_cama')")
    op.execute("CREATE TYPE seat_status AS ENUM ('available', 'reserved', 'sold')")
    op.execute("CREATE TYPE trip_status AS ENUM ('scheduled', 'completed', 'cancelled')")
    op.execute("CREATE TYPE booking_status AS ENUM ('pending_payment', 'confirmed', 'expired')")

    op.create_table(
        "routes",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("origin", sa.String(100), nullable=False),
        sa.Column("destination", sa.String(100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("origin", "destination"),
    )

    op.create_table(
        "trips",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("route_id", sa.UUID(), nullable=False),
        sa.Column("departure_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("arrival_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            sa.Text(),
            server_default="scheduled",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["route_id"], ["routes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute("ALTER TABLE trips ALTER COLUMN status TYPE trip_status USING status::trip_status")

    op.create_table(
        "seats",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("trip_id", sa.UUID(), nullable=False),
        sa.Column("seat_number", sa.String(4), nullable=False),
        sa.Column("seat_type", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Text(),
            server_default="available",
            nullable=False,
        ),
        sa.Column("reserved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("trip_id", "seat_number"),
    )
    op.execute("ALTER TABLE seats ALTER COLUMN seat_type TYPE seat_type USING seat_type::seat_type")
    op.execute("ALTER TABLE seats ALTER COLUMN status TYPE seat_status USING status::seat_status")

    op.create_index("idx_seats_trip_status", "seats", ["trip_id", "status"])
    op.create_index(
        "idx_seats_reserved_at",
        "seats",
        ["reserved_at"],
        postgresql_where=sa.text("status = 'reserved'"),
    )

    op.create_table(
        "price_tranches",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("trip_id", sa.UUID(), nullable=False),
        sa.Column("seat_type", sa.Text(), nullable=False),
        sa.Column("min_sold", sa.Integer(), nullable=False),
        sa.Column("max_sold", sa.Integer(), nullable=False),
        sa.Column("price", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("min_sold >= 0", name="ck_price_tranches_min_sold"),
        sa.CheckConstraint("max_sold > min_sold", name="ck_price_tranches_max_sold"),
        sa.CheckConstraint("price > 0", name="ck_price_tranches_price"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("trip_id", "seat_type", "min_sold"),
    )
    op.execute(
        "ALTER TABLE price_tranches ALTER COLUMN seat_type TYPE seat_type USING seat_type::seat_type"
    )

    op.create_index("idx_price_tranches_trip_type", "price_tranches", ["trip_id", "seat_type"])

    op.create_table(
        "bookings",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("trip_id", sa.UUID(), nullable=False),
        sa.Column(
            "status",
            sa.Text(),
            server_default="pending_payment",
            nullable=False,
        ),
        sa.Column("mp_preference_id", sa.String(255), nullable=True),
        sa.Column("mp_payment_id", sa.String(255), nullable=True),
        sa.Column("total_amount", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reminder_sent", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("feedback_sent", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("total_amount > 0", name="ck_bookings_total_amount"),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        "ALTER TABLE bookings ALTER COLUMN status TYPE booking_status USING status::booking_status"
    )

    op.create_index("idx_bookings_trip", "bookings", ["trip_id"])
    op.create_index("idx_bookings_status", "bookings", ["status"])
    op.create_index(
        "idx_bookings_expires",
        "bookings",
        ["expires_at"],
        postgresql_where=sa.text("status = 'pending_payment'"),
    )

    op.create_table(
        "passengers",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("booking_id", sa.UUID(), nullable=False),
        sa.Column("seat_id", sa.UUID(), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("dni", sa.String(20), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"]),
        sa.ForeignKeyConstraint(["seat_id"], ["seats.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("seat_id"),
    )

    op.create_index("idx_passengers_booking", "passengers", ["booking_id"])
    op.create_index("idx_passengers_email", "passengers", ["email"])

    op.create_table(
        "admin_users",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )


def downgrade() -> None:
    op.drop_table("admin_users")

    op.drop_index("idx_passengers_email", table_name="passengers")
    op.drop_index("idx_passengers_booking", table_name="passengers")
    op.drop_table("passengers")

    op.drop_index("idx_bookings_expires", table_name="bookings")
    op.drop_index("idx_bookings_status", table_name="bookings")
    op.drop_index("idx_bookings_trip", table_name="bookings")
    op.drop_table("bookings")

    op.drop_index("idx_price_tranches_trip_type", table_name="price_tranches")
    op.drop_table("price_tranches")

    op.drop_index("idx_seats_reserved_at", table_name="seats")
    op.drop_index("idx_seats_trip_status", table_name="seats")
    op.drop_table("seats")

    op.drop_table("trips")
    op.drop_table("routes")

    op.execute("DROP TYPE booking_status")
    op.execute("DROP TYPE trip_status")
    op.execute("DROP TYPE seat_status")
    op.execute("DROP TYPE seat_type")
