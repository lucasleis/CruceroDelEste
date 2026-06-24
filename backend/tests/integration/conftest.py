"""Integration test configuration.

One Postgres container per pytest session. Tables created once via a sync
engine (avoids session-scoped async fixture / event-loop issues in
pytest-asyncio). Each test gets a clean slate via TRUNCATE before it runs.
"""

from collections.abc import AsyncGenerator
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine as _create_sync_engine
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from testcontainers.postgres import PostgresContainer

# Import models so their tables are registered with Base before create_all.
import app.models.booking  # noqa: F401
import app.models.trip  # noqa: F401
from app.database import Base, get_db
from app.main import app

# Dependency order: children before parents so CASCADE works correctly.
_TABLES = [
    "refund_requests",
    "passengers",
    "bookings",
    "seats",
    "price_tranches",
    "trips",
    "routes",
    "stops",
    "admin_users",
]


# ---------------------------------------------------------------------------
# Postgres container + async engine  (session-scoped, started once)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def pg_container():
    with PostgresContainer("postgres:16") as container:
        yield container


@pytest.fixture(scope="session")
def test_engine(pg_container):
    sync_url = pg_container.get_connection_url()
    # testcontainers returns a psycopg2 URL; build both the sync (for
    # metadata.create_all) and async (for test sessions) variants.
    async_url = sync_url.replace(
        "postgresql+psycopg2://", "postgresql+asyncpg://"
    ).replace("postgresql://", "postgresql+asyncpg://")

    # Create tables via sync engine — avoids needing a session-scoped event loop.
    sync_engine = _create_sync_engine(sync_url)
    Base.metadata.create_all(sync_engine)
    sync_engine.dispose()

    engine = create_async_engine(async_url, echo=False, poolclass=NullPool)
    yield engine
    # engine.dispose() is a coroutine in SQLAlchemy 2 async; use the underlying
    # sync pool dispose so we stay in a sync fixture.
    engine.sync_engine.dispose()


# ---------------------------------------------------------------------------
# Per-test fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture(autouse=True)
async def truncate_tables(test_engine):
    """Wipe all rows before every integration test (not after, so failures
    leave data in place for debugging if the test is run in isolation)."""
    async with test_engine.begin() as conn:
        await conn.execute(
            text(f"TRUNCATE {', '.join(_TABLES)} RESTART IDENTITY CASCADE")
        )


@pytest_asyncio.fixture
async def db(test_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient with get_db overridden to use the test session.

    The APScheduler lifespan (scheduler.start / register_jobs / scheduler.shutdown)
    is mocked so the test container URL doesn't need to match SYNC_DATABASE_URL.
    """
    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db

    app.dependency_overrides[get_db] = _override_get_db

    with patch("app.main.scheduler"), patch("app.main.register_jobs"):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as ac:
            yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Rate limiter reset (autouse — prevents counter bleed across tests)
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Reset slowapi MemoryStorage before each test.

    Without this, POST /admin/login calls from earlier tests accumulate in the
    shared in-memory counter and exhaust the 10/min limit before price-tranche
    tests can authenticate. reset() is public API on limits.storage.MemoryStorage.
    """
    from app.limiter import limiter
    limiter._storage.reset()


# ---------------------------------------------------------------------------
# MercadoPago SDK mock (autouse — no real HTTP calls from any integration test)
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def mock_mp_sdk():
    """Patch _sdk in app.services.payment.

    Tests that exercise the webhook handler MUST override
    ``mock_mp_sdk.payment.return_value.get.return_value`` with the actual
    booking UUID as ``external_reference`` before issuing the POST request.
    """
    mock_sdk = MagicMock()

    mock_sdk.preference.return_value.create.return_value = {
        "status": 201,
        "response": {
            "id": "fake-preference-id",
            "init_point": (
                "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=fake"
            ),
        },
    }

    mock_sdk.payment.return_value.get.return_value = {
        "status": 200,
        "response": {
            "id": 123456789,
            "status": "approved",
            "external_reference": None,  # override per-test in webhook tests
            "transaction_amount": 24500.0,
        },
    }

    mock_sdk.payment.return_value.refunds.return_value = {
        "status": 201,
        "response": {"id": 12345678},
    }

    with patch("app.services.payment._sdk", mock_sdk):
        yield mock_sdk
