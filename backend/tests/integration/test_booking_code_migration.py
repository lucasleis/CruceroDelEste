"""Integration test for migrations/versions/e2f4a8c6_add_booking_code_to_bookings.py.

Runs the real Alembic upgrade/downgrade against a throwaway database created
inside the same Postgres container used by the rest of the integration
suite — isolated from the schema `Base.metadata.create_all` sets up for
every other test, so applying/reverting this migration here can't affect
(or be affected by) any other test's data or schema state.

Covers what LLE-350 asked for explicitly:
  - the migration applies and reverts without error
  - it backfills existing rows (not just the empty-table case)
"""

import os
import uuid
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.config import Config

_BACKEND_DIR = Path(__file__).resolve().parents[2]
_ALEMBIC_INI = _BACKEND_DIR / "alembic.ini"

_TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


def _base_sync_url(pg_container) -> str:
    """Mirror conftest.py's test_engine URL resolution — this test needs its
    own admin connection to CREATE/DROP a scratch database, which conftest
    doesn't expose directly (test_engine is already bound to one fixed db)."""
    if _TEST_DATABASE_URL:
        return _TEST_DATABASE_URL
    return pg_container.get_connection_url()


@pytest.fixture
def scratch_db(pg_container):
    """Create an empty database for this test only, drop it afterward.

    Yields (sync_url, async_url) for the scratch database — sync for setup/
    assertions via plain SQL, async for pointing Alembic's env.py at it
    (env.py builds an async engine from DATABASE_URL).
    """
    base_url = sa.engine.make_url(_base_sync_url(pg_container))
    scratch_name = f"booking_code_migration_{uuid.uuid4().hex[:12]}"

    admin_engine = sa.create_engine(base_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.execute(sa.text(f'CREATE DATABASE "{scratch_name}"'))
    admin_engine.dispose()

    scratch_sync_url = base_url.set(database=scratch_name)
    scratch_async_url = scratch_sync_url.set(drivername="postgresql+asyncpg")

    # str(URL) masks the password (render_as_string(hide_password=True) is
    # the default __str__) — these URLs get used to actually authenticate,
    # not just displayed, so they need the real password.
    yield (
        scratch_sync_url.render_as_string(hide_password=False),
        scratch_async_url.render_as_string(hide_password=False),
    )

    admin_engine = sa.create_engine(base_url, isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as conn:
        conn.execute(
            sa.text(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                "WHERE datname = :name AND pid <> pg_backend_pid()"
            ),
            {"name": scratch_name},
        )
        conn.execute(sa.text(f'DROP DATABASE IF EXISTS "{scratch_name}"'))
    admin_engine.dispose()


def _alembic_config(async_url: str) -> Config:
    cfg = Config(str(_ALEMBIC_INI))
    cfg.set_main_option("script_location", str(_BACKEND_DIR / "migrations"))
    # env.py reads DATABASE_URL itself (overrides alembic.ini's sqlalchemy.url) —
    # set it via env var rather than set_main_option so env.py's own logic runs.
    os.environ["DATABASE_URL"] = async_url
    return cfg


def _insert_minimal_trip_chain(sync_url: str) -> uuid.UUID:
    """Insert the minimal Stop/Route/Trip/Booking chain needed for a Booking
    row to exist pre-migration (bookings.trip_id is NOT NULL + FK). Returns
    the inserted booking's id."""
    engine = sa.create_engine(sync_url)
    origin_id, dest_id, route_id, trip_id, booking_id = (uuid.uuid4() for _ in range(5))

    with engine.begin() as conn:
        conn.execute(
            sa.text(
                "INSERT INTO stops (id, name, country, created_at) "
                "VALUES (:id, :name, :country, now())"
            ),
            [
                {"id": origin_id, "name": "Retiro", "country": "AR"},
                {"id": dest_id, "name": "Asunción", "country": "PY"},
            ],
        )
        conn.execute(
            sa.text(
                "INSERT INTO routes (id, origin_stop_id, destination_stop_id, created_at) "
                "VALUES (:id, :origin_id, :dest_id, now())"
            ),
            {"id": route_id, "origin_id": origin_id, "dest_id": dest_id},
        )
        conn.execute(
            sa.text(
                "INSERT INTO trips (id, route_id, departure_at, arrival_at, status, created_at) "
                "VALUES (:id, :route_id, now() + interval '1 day', now() + interval '1 day 4 hours', "
                "'scheduled', now())"
            ),
            {"id": trip_id, "route_id": route_id},
        )
        conn.execute(
            sa.text(
                "INSERT INTO bookings "
                "(id, trip_id, status, contact_email, total_amount, expires_at, "
                "confirmed_at, reminder_sent, feedback_sent, created_at) "
                "VALUES (:id, :trip_id, 'pending_payment', 'buyer@example.com', 24500, "
                "now() + interval '15 minutes', NULL, false, false, now())"
            ),
            {"id": booking_id, "trip_id": trip_id},
        )
    engine.dispose()
    return booking_id


def test_migration_backfills_existing_rows_and_reverts_cleanly(scratch_db):
    sync_url, async_url = scratch_db
    cfg = _alembic_config(async_url)

    try:
        # Apply every migration up to (but not including) this one, so the
        # scratch DB is in the exact pre-migration state — bookings table
        # exists, booking_code does not.
        command.upgrade(cfg, "d1e2f3a4")

        booking_id = _insert_minimal_trip_chain(sync_url)

        # Apply this migration on top of a table that already has a row —
        # this is the actual requirement (LLE-350 point 4), not just "runs
        # on an empty table".
        command.upgrade(cfg, "head")

        engine = sa.create_engine(sync_url)
        with engine.connect() as conn:
            row = conn.execute(
                sa.text("SELECT booking_code FROM bookings WHERE id = :id"),
                {"id": booking_id},
            ).one()
            code = row[0]
            assert code is not None
            assert code.startswith("ERP-")
            assert len(code) == 13

            # NOT NULL enforced.
            nullable = conn.execute(
                sa.text(
                    "SELECT is_nullable FROM information_schema.columns "
                    "WHERE table_name = 'bookings' AND column_name = 'booking_code'"
                )
            ).scalar_one()
            assert nullable == "NO"

            # Unique constraint enforced — inserting a duplicate must fail.
            duplicate_id = uuid.uuid4()
            with pytest.raises(sa.exc.IntegrityError):
                with conn.begin_nested():
                    conn.execute(
                        sa.text(
                            "INSERT INTO bookings "
                            "(id, trip_id, booking_code, status, contact_email, total_amount, "
                            "expires_at, confirmed_at, reminder_sent, feedback_sent, created_at) "
                            "SELECT :new_id, trip_id, booking_code, status, "
                            "contact_email, total_amount, expires_at, confirmed_at, "
                            "reminder_sent, feedback_sent, now() "
                            "FROM bookings WHERE id = :id"
                        ),
                        {"new_id": duplicate_id, "id": booking_id},
                    )
        engine.dispose()

        # Revert without error — the actual "aplicar y revertir sin error"
        # requirement.
        command.downgrade(cfg, "-1")

        engine = sa.create_engine(sync_url)
        with engine.connect() as conn:
            remaining_columns = conn.execute(
                sa.text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'bookings' AND column_name = 'booking_code'"
                )
            ).fetchall()
            assert remaining_columns == []

            # The row itself must have survived the downgrade — only the
            # column should be gone, not the data.
            still_there = conn.execute(
                sa.text("SELECT id FROM bookings WHERE id = :id"), {"id": booking_id}
            ).scalar_one_or_none()
            assert still_there == booking_id
        engine.dispose()
    finally:
        os.environ.pop("DATABASE_URL", None)
