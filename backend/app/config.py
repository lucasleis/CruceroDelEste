from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str

    # Security
    secret_key: str
    jwt_expiry_minutes: int = 60

    # MercadoPago
    mercadopago_access_token: str
    mercadopago_webhook_secret: str

    # Email
    resend_api_key: str

    # App
    frontend_url: str
    backend_url: str
    environment: str = "dev"
    booking_expiry_minutes: int = 15


settings = Settings()
