from uuid import UUID

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.services.pricing import NoPriceTranche


class SeatUnavailableError(Exception):
    def __init__(self, seat_id: str) -> None:
        self.seat_id = seat_id
        super().__init__(f"Seat {seat_id} is not available")


class SeatAlreadyReleasedError(Exception):
    def __init__(self, seat_id: UUID) -> None:
        self.seat_id = seat_id
        super().__init__(f"Seat {seat_id} is no longer reserved")


class NotFoundError(HTTPException):
    def __init__(
        self,
        status_code: int = status.HTTP_404_NOT_FOUND,
        detail: str = "not_found",
    ) -> None:
        super().__init__(status_code=status_code, detail=detail)


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


class RefundWindowExpiredError(Exception):
    """Raised when a refund request fails either condition of the legal window
    (Resolución 424/2020). Both conditions must hold simultaneously:
      1. Within 10 calendar days of confirmed_at (purchase date).
      2. More than 24 hours before the trip's departure_at.

    The RefundRequest row is already committed before this is raised; its id
    is surfaced in the 422 response body as a tracking code for the consumer.
    """

    def __init__(self, refund_request_id: UUID) -> None:
        self.refund_request_id = refund_request_id
        super().__init__(f"Refund window expired for request {refund_request_id}")


class ChargebackAlreadyInStatusError(Exception):
    """Raised by upsert_chargeback when the status hasn't changed."""


class TripHasNoSeatLayoutError(Exception):
    pass


class TrancheLimitExceededError(Exception):
    pass


class TrancheExceedsSeatCapacityError(Exception):
    pass


class TrancheOverlapError(Exception):
    pass


class TrancheMustStartAtZeroError(Exception):
    pass


class TrancheGapError(Exception):
    pass


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

    @app.exception_handler(RefundWindowExpiredError)
    async def refund_window_expired_handler(
        request: Request, exc: RefundWindowExpiredError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": "refund_window_expired",
                "refund_request_id": str(exc.refund_request_id),
            },
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

    @app.exception_handler(NoPriceTranche)
    async def no_price_tranche_handler(
        request: Request, exc: NoPriceTranche
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "no_price_tranche_available"},
        )

    @app.exception_handler(500)
    async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "internal_server_error"},
        )
