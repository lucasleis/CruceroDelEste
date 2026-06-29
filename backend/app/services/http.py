import asyncio
import logging
import random
from collections.abc import Awaitable, Callable

from app.errors import PaymentProcessingError

logger = logging.getLogger(__name__)


async def call_with_retry(
    fn: Callable[[], Awaitable[dict]],
    *,
    max_retries: int = 3,
    base_delay: float = 1.0,
) -> dict:
    for attempt in range(max_retries + 1):
        result = await fn()
        if result.get("status") != 429:
            return result
        if attempt == max_retries:
            break
        delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
        await asyncio.sleep(delay)

    logger.warning("MP rate limit: max retries exhausted after %d attempts", max_retries)
    raise PaymentProcessingError("MP rate limit exceeded", status_code=429)
