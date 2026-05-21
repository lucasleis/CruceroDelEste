import os

# Set fake env vars at module level, before any app import, so that
# pydantic-settings reads them when app.config is first imported.
# asyncio_mode = "auto" is configured in pyproject.toml [tool.pytest.ini_options].
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("SYNC_DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("BACKEND_URL", "http://test.example.com")
os.environ.setdefault("FRONTEND_URL", "http://frontend.example.com")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only-not-production")
os.environ.setdefault("MERCADOPAGO_ACCESS_TOKEN", "TEST-fake-access-token")
os.environ.setdefault("MERCADOPAGO_WEBHOOK_SECRET", "fake-webhook-secret")
os.environ.setdefault("RESEND_API_KEY", "re_fake_api_key")
os.environ.setdefault("JWT_EXPIRY_MINUTES", "60")
os.environ.setdefault("BOOKING_EXPIRY_MINUTES", "15")
os.environ.setdefault("ENVIRONMENT", "dev")

from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture(autouse=True)
def mock_resend():
    """Prevent any real Resend HTTP calls in all tests."""
    with patch("resend.Emails.send", return_value={"id": "test-id"}):
        yield


@pytest.fixture(autouse=True)
def mock_mp_sdk():
    """Prevent any real MercadoPago HTTP calls in all tests.

    Yields the MagicMock so individual tests can reconfigure return values:

        def test_something(mock_mp_sdk):
            mock_mp_sdk.payment.return_value.get.return_value = {
                "status": 200,
                "response": {...},
            }
    """
    mock_sdk = MagicMock()

    mock_sdk.preference.return_value.create.return_value = {
        "status": 201,
        "response": {
            "id": "fake-preference-id",
            "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=fake",
        },
    }

    # external_reference is set to None here; integration tests that exercise
    # the webhook handler MUST override it with the actual booking UUID.
    mock_sdk.payment.return_value.get.return_value = {
        "status": 200,
        "response": {
            "id": 123456789,
            "status": "approved",
            "external_reference": None,
            "transaction_amount": 24500.0,
        },
    }

    with patch("app.services.payment._sdk", mock_sdk):
        yield mock_sdk
