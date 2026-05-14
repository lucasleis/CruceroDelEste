class InvalidWebhookSignature(Exception):
    """x-signature header from MercadoPago failed validation.

    Reasons: missing header, malformed format, timestamp outside replay window,
    or HMAC digest mismatch.
    """


class PaymentProcessingError(Exception):
    """MercadoPago API returned a non-success HTTP status.

    Carries the original status code and a human-readable reason for logging.
    """

    def __init__(self, message: str, status_code: int | None = None) -> None:
        self.status_code = status_code
        super().__init__(message)


class PaymentConfigError(Exception):
    """Payment configuration is missing or invalid.

    Raised at startup by pydantic validators when required payment settings
    (e.g. mercadopago_access_token, backend_url) are absent or malformed.
    """
