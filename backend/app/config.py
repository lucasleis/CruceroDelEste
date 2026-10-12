from typing import Literal
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
    # Required only when mercadopago_webhook_enabled is True (validated below).
    mercadopago_webhook_secret: str = ""
    # False: POST /webhooks/mercadopago acknowledges and ignores payment
    # notifications, and bookings are confirmed only by the check the
    # confirmation page triggers (POST /bookings/{id}/payments/{pid}/verify).
    mercadopago_webhook_enabled: bool = True

    # Email. With SMTP_HOST set, mail goes through that server; otherwise
    # through Resend (RESEND_API_KEY).
    resend_api_key: str = ""
    email_from: str = "no-reply@expresorioparana.com"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    # starttls (usual on 587) | ssl (usual on 465) | none (plain, e.g. a local relay on 25)
    smtp_security: Literal["starttls", "ssl", "none"] = "starttls"

    # App
    # backend_url: public base URL of this API, sent to MercadoPago as notification_url.
    # Must be reachable by MercadoPago servers; MUST use https in production.
    frontend_url: str
    backend_url: str
    environment: str = "dev"
    booking_expiry_minutes: int = 15
    cors_origins: list[str] = ["http://localhost:3000"]

    @property
    def cookie_secure(self) -> bool:
        # Secure cookies are dropped over plain http, so follow how this API is
        # actually served rather than the environment name.
        return self.backend_url.startswith("https://")

    @model_validator(mode="after")
    def _validate_backend_url(self) -> "Settings":
        if len(self.secret_key) < 32:
            raise ValueError(
                "secret_key must be at least 32 characters long. "
                "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if self.mercadopago_webhook_enabled and not self.mercadopago_webhook_secret:
            raise ValueError(
                "mercadopago_webhook_secret is required when "
                "mercadopago_webhook_enabled is true"
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
