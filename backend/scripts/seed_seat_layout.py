"""Seed script to replace the placeholder SeatLayout with the real client layout (LLE-145).

Seat numbers are documented here for reference only — seats themselves are
generated per-Trip (see app/routers/admin_catalog.py), not per-SeatLayout.

Semi Cama (planta alta): 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 59, 60

Cama Ejecutivo (planta baja): 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58

Usage (from backend/):
    python -m scripts.seed_seat_layout
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
from app.models.trip import SeatLayout  # noqa: E402

PLACEHOLDER_NAME = "Placeholder - Pendiente flota real"

NEW_LAYOUT = {
    "name": "Standard - 2 Pisos",
    "total_cama": 12,
    "total_semi_cama": 48,
    "description": (
        "Layout estándar de flota. Planta baja: Cama Ejecutivo (12 asientos, "
        "números 47-58). Planta alta: Semi Cama (48 asientos, números 1-60 "
        "numeración no correlativa)."
    ),
}


async def seed_seat_layout() -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SeatLayout).where(SeatLayout.name == PLACEHOLDER_NAME)
        )
        placeholder = result.scalar_one_or_none()

        if placeholder is not None:
            await session.delete(placeholder)
            print(f"Deleted SeatLayout: {PLACEHOLDER_NAME!r} (id={placeholder.id})")
        else:
            print(f"No placeholder SeatLayout found with name {PLACEHOLDER_NAME!r} — nothing to delete.")

        new_layout = SeatLayout(**NEW_LAYOUT)
        session.add(new_layout)
        await session.commit()
        await session.refresh(new_layout)

        print(
            f"Created SeatLayout: {new_layout.name!r} (id={new_layout.id}, "
            f"total_cama={new_layout.total_cama}, total_semi_cama={new_layout.total_semi_cama})"
        )


if __name__ == "__main__":
    asyncio.run(seed_seat_layout())
