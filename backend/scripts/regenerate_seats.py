"""Backfill script to generate Seats for trips missing them (LLE-143).

Usage (from backend/):
    python -m scripts.regenerate_seats
"""

import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env before importing app.config (Settings reads env vars at import time).
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import AsyncSessionLocal  # noqa: E402
from app.models.trip import Seat, SeatLayoutSeat, SeatStatusEnum, Trip  # noqa: E402


async def regenerate_seats() -> None:
    trips_processed = 0
    seats_inserted = 0
    trips_skipped = 0

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Trip).where(Trip.seat_layout_id.is_not(None))
        )
        trips = result.scalars().all()

        for trip in trips:
            existing_result = await session.execute(
                select(Seat.id).where(Seat.trip_id == trip.id).limit(1)
            )
            if existing_result.scalar_one_or_none() is not None:
                trips_skipped += 1
                continue

            layout_seats_result = await session.execute(
                select(SeatLayoutSeat)
                .where(SeatLayoutSeat.seat_layout_id == trip.seat_layout_id)
                .order_by(SeatLayoutSeat.display_order.asc())
            )
            layout_seats = layout_seats_result.scalars().all()

            for ls in layout_seats:
                session.add(Seat(
                    trip_id=trip.id,
                    seat_number=ls.seat_number,
                    seat_type=ls.seat_type,
                    status=SeatStatusEnum.available,
                ))
                seats_inserted += 1

            trips_processed += 1

        await session.commit()

    print(f"Trips processed: {trips_processed}")
    print(f"Seats inserted: {seats_inserted}")
    print(f"Trips skipped (already had seats): {trips_skipped}")


if __name__ == "__main__":
    asyncio.run(regenerate_seats())
