"""Human-facing booking identifier — "ERP-7K3M-9QX2" (LLE-350).

Format: "ERP-" + 4 chars + "-" + 4 chars, drawn from BOOKING_CODE_ALPHABET
(32 symbols: digits 2-9 and uppercase letters minus O/I — no visually
ambiguous characters). 32**8 ≈ 1.1e12 possible codes.

Collision handling: generate_unique_booking_code() does a SELECT before
INSERT, which is enough to avoid the practically-never-happening case of
generating a code that already exists. The theoretical race between that
SELECT and the caller's INSERT (two requests generating the same code in
the same instant, over a ~1.1e12 keyspace) is left to surface as an
IntegrityError on flush — same as any other insertion failure — rather than
adding a SAVEPOINT-based retry for a probability this low. See LLE-350
exploration notes for the full reasoning.
"""

import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking

# Excludes O, 0, I, 1 — no characters a person could misread over the phone
# or when copying a support ticket by hand.
BOOKING_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

_PREFIX = "ERP"
_GROUP_LENGTH = 4
_GROUP_COUNT = 2

# Cheap safety net for the case where a freshly generated code already
# exists in the table (not the flush-time race — see module docstring).
# At 32**8 possible codes this should never actually loop more than once.
_MAX_GENERATION_ATTEMPTS = 5


class BookingCodeExhaustedError(Exception):
    """Raised if _MAX_GENERATION_ATTEMPTS consecutive codes all collide.

    Not expected to ever happen in practice (see module docstring) — exists
    so generate_unique_booking_code() fails loudly and deterministically
    instead of looping forever if it somehow does.
    """


def generate_booking_code() -> str:
    """Generate one candidate code. Does not check the database — callers
    that need uniqueness should use generate_unique_booking_code()."""
    groups = [
        "".join(secrets.choice(BOOKING_CODE_ALPHABET) for _ in range(_GROUP_LENGTH))
        for _ in range(_GROUP_COUNT)
    ]
    return f"{_PREFIX}-{'-'.join(groups)}"


async def generate_unique_booking_code(db: AsyncSession) -> str:
    """Generate a booking_code not currently present in bookings.

    Caller is still responsible for handling an IntegrityError on the
    subsequent flush/commit — this only closes the common case.
    """
    for _ in range(_MAX_GENERATION_ATTEMPTS):
        code = generate_booking_code()
        result = await db.execute(
            select(Booking.id).where(Booking.booking_code == code).limit(1)
        )
        if result.scalar_one_or_none() is None:
            return code
    raise BookingCodeExhaustedError()
