import pytest
from pydantic import ValidationError

from app.config import Settings


def test_webhook_secret_optional_when_webhook_disabled(monkeypatch):
    monkeypatch.delenv("MERCADOPAGO_WEBHOOK_SECRET", raising=False)
    settings = Settings(_env_file=None, mercadopago_webhook_enabled=False)
    assert settings.mercadopago_webhook_secret == ""


def test_webhook_secret_required_when_webhook_enabled(monkeypatch):
    monkeypatch.delenv("MERCADOPAGO_WEBHOOK_SECRET", raising=False)
    with pytest.raises(ValidationError, match="mercadopago_webhook_secret is required"):
        Settings(_env_file=None, mercadopago_webhook_enabled=True)
