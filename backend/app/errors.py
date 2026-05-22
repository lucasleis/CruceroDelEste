from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class SeatUnavailableError(Exception):
    def __init__(self, seat_id: str) -> None:
        self.seat_id = seat_id
        super().__init__(f"Seat {seat_id} is not available")


class NotFoundError(HTTPException):
    def __init__(
        self,
        status_code: int = status.HTTP_404_NOT_FOUND,
        detail: str = "not_found",
    ) -> None:
        super().__init__(status_code=status_code, detail=detail)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(SeatUnavailableError)
    async def seat_unavailable_handler(
        request: Request, exc: SeatUnavailableError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "seat_unavailable", "seat_id": exc.seat_id},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": exc.errors()},
        )

    @app.exception_handler(NotFoundError)
    async def not_found_error_handler(
        request: Request, exc: NotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": "not_found"},
        )

    @app.exception_handler(500)
    async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "internal_server_error"},
        )


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
