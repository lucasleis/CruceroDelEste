"""Seed script for the seat_layout_seats table (LLE-143).

Usage (from backend/):
    python -m scripts.seed_layout_seats
"""

import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env before importing app.config (Settings reads env vars at import time).
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select  # noqa: E402

from app.database import AsyncSessionLocal  # noqa: E402
from app.models.trip import SeatLayout, SeatLayoutSeat, SeatTypeEnum  # noqa: E402

LAYOUT_NAME = "Standard - 2 Pisos"

CAMA_NUMBERS = [
    "51", "50", "49", "52", "54", "53", "55", "58", "57", "56", "48", "47",
]

SEMI_CAMA_NUMBERS = [
    "3", "4", "2", "1", "6", "5", "8", "7", "9", "10", "12", "11",
    "13", "14", "16", "15", "17", "18", "20", "19", "21", "22", "24", "23",
    "25", "26", "28", "27", "29", "30", "32", "31", "35", "36", "34", "33",
    "39", "40", "38", "37", "43", "44", "42", "41", "59", "60", "46", "45",
]


async def seed_layout_seats() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SeatLayout).where(SeatLayout.name == LAYOUT_NAME)
        )
        layout = result.scalar_one_or_none()

        if layout is None:
            print(f"No SeatLayout found with name {LAYOUT_NAME!r} — aborting.")
            return

        print(f"Found SeatLayout: {layout.name!r} (id={layout.id})")

        delete_result = await session.execute(
            delete(SeatLayoutSeat)
            .where(SeatLayoutSeat.seat_layout_id == layout.id)
            .returning(SeatLayoutSeat.id)
        )
        deleted = len(delete_result.fetchall())

        seats: list[SeatLayoutSeat] = []
        for order, number in enumerate(CAMA_NUMBERS):
            seats.append(
                SeatLayoutSeat(
                    seat_layout_id=layout.id,
                    seat_number=number,
                    seat_type=SeatTypeEnum.cama,
                    display_order=order,
                )
            )
        for order, number in enumerate(SEMI_CAMA_NUMBERS):
            seats.append(
                SeatLayoutSeat(
                    seat_layout_id=layout.id,
                    seat_number=number,
                    seat_type=SeatTypeEnum.semi_cama,
                    display_order=order,
                )
            )

        session.add_all(seats)
        await session.commit()

        print(f"Seats deleted: {deleted}")
        print(f"Seats inserted: {len(seats)}")


if __name__ == "__main__":
    asyncio.run(seed_layout_seats())
