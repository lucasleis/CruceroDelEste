from urllib.parse import urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str
    sync_database_url: str

    # Security
    secret_key: str  # Must be at least 32 characters — use secrets.token_hex(32)
    jwt_expiry_minutes: int = 60

    # MercadoPago
    mercadopago_access_token: str
    mercadopago_webhook_secret: str

    # Email
    resend_api_key: str

    # App
    # backend_url: public base URL of this API, sent to MercadoPago as notification_url.
    # Must be reachable by MercadoPago servers; MUST use https in production.
    frontend_url: str
    backend_url: str
    environment: str = "dev"
    booking_expiry_minutes: int = 15
    cors_origins: list[str] = ["http://localhost:3000", "http://31.97.25.173"]

    @model_validator(mode="after")
    def _validate_backend_url(self) -> "Settings":
        if len(self.secret_key) < 32:
            raise ValueError(
                "secret_key must be at least 32 characters long. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        parsed = urlparse(self.backend_url)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError(
                f"backend_url must be an absolute URL (got: {self.backend_url!r})"
            )
        if self.environment == "production" and parsed.scheme != "https":
            raise ValueError(
                "backend_url must use https:// in production "
                f"(got scheme: {parsed.scheme!r})"
            )
        return self


settings = Settings()
