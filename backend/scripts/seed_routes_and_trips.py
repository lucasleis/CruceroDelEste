"""Seed script for La Plata -> Ciudad del Este route, stops and recurring trips (LLE-141).

Usage (from backend/):
    python -m scripts.seed_routes_and_trips
"""

import asyncio
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv

# Load .env before importing app.config (Settings reads env vars at import time).
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.database import AsyncSessionLocal  # noqa: E402
from app.models.trip import Route, RouteStop, SeatLayout, Trip, TripStatusEnum  # noqa: E402

ART = timezone(timedelta(hours=-3))

LA_PLATA_ID = uuid.UUID("fc015388-6f95-404f-bc95-55fc0d1da7e8")
CIUDAD_DEL_ESTE_ID = uuid.UUID("a03d416a-9b7b-446e-a320-7ae48cb033e7")

ROUTE_STOP_IDS: list[uuid.UUID] = [
    uuid.UUID("fc015388-6f95-404f-bc95-55fc0d1da7e8"),  # La Plata
    uuid.UUID("82ba0c6c-7dfb-465d-85b2-9d6dcf1b34fa"),  # Varela
    uuid.UUID("aaa59214-9645-4ab8-bea4-1040b956a737"),  # Solano Ag 24 y Monteverde
    uuid.UUID("e557a8ac-f2d1-45fa-81c3-b3689766853e"),  # Burzaco Rot. Vapor
    uuid.UUID("c07092d6-0dd5-42c3-a441-690053b3a96a"),  # La Noria Terminal
    uuid.UUID("88ef3784-3442-48a4-8964-f0281749d018"),  # San Justo
    uuid.UUID("2a19bfcd-963e-4a03-94a1-cf6e7c7d90e2"),  # Terminal Liniers
    uuid.UUID("0b3c7936-fd68-4965-a55c-df5ae9281130"),  # Terminal Retiro
    uuid.UUID("32096478-80c2-42de-b628-8a023de22c0c"),  # Terminal Pacheco
    uuid.UUID("ddf6a58f-d41b-4447-9be2-f590f488e6ea"),  # Parador Escobar
    uuid.UUID("eda4583a-0b8c-472a-8b8f-9e2f3feab999"),  # Terminal Campana
    uuid.UUID("f151ff17-82e1-4829-890f-2e1b76e61be9"),  # Terminal Encarnación
    uuid.UUID("36c325a1-1990-4067-8e72-8de9cfb08b0d"),  # Capitán Miranda
    uuid.UUID("e191a226-245f-482c-a109-f6d16b921d73"),  # Cruce Hohenau
    uuid.UUID("0cdcdea8-73ad-487e-be16-f4b0cb2367a4"),  # Bella Vista Itapúa
    uuid.UUID("55ce8713-b16a-4e27-b9de-22e3000cc17f"),  # Cruce Edelira Km 28
    uuid.UUID("b631a79e-4956-4106-b101-ce0d128888d2"),  # María Auxiliadora
    uuid.UUID("3ee00fa6-43ae-4333-8925-45008ab34bdf"),  # Terminal Santa Rita
    uuid.UUID("764d3fa2-1cbb-433f-a108-28173dc77c94"),  # Cruce Tavapy
    uuid.UUID("9c5b822b-e96d-48dd-91e5-76d2f07b2972"),  # Km 30 CDE
    uuid.UUID("b8a0d5da-2fe5-4cbc-b8eb-16d3f1230207"),  # Terminal Km9 CDE
    uuid.UUID("a03d416a-9b7b-446e-a320-7ae48cb033e7"),  # Terminal Ciudad del Este
]

SEAT_LAYOUT_NAME = "Standard - 2 Pisos"
DEPARTURE_HOUR = 15
SUNDAY = 6
TRIP_WINDOW_DAYS = 120
TRIP_DURATION_HOURS = 20


async def seed_route(session) -> tuple[Route, bool]:
    result = await session.execute(
        select(Route).where(
            Route.origin_stop_id == LA_PLATA_ID,
            Route.destination_stop_id == CIUDAD_DEL_ESTE_ID,
        )
    )
    route = result.scalar_one_or_none()
    if route is not None:
        return route, False

    route = Route(origin_stop_id=LA_PLATA_ID, destination_stop_id=CIUDAD_DEL_ESTE_ID)
    session.add(route)
    await session.flush()
    return route, True


async def seed_route_stops(session, route: Route) -> int:
    await session.execute(
        RouteStop.__table__.delete().where(RouteStop.route_id == route.id)
    )
    for order, stop_id in enumerate(ROUTE_STOP_IDS):
        session.add(RouteStop(route_id=route.id, stop_id=stop_id, order=order))
    return len(ROUTE_STOP_IDS)


async def get_seat_layout(session) -> SeatLayout:
    result = await session.execute(select(SeatLayout).where(SeatLayout.name == SEAT_LAYOUT_NAME))
    seat_layout = result.scalar_one_or_none()
    if seat_layout is None:
        raise RuntimeError(f"SeatLayout '{SEAT_LAYOUT_NAME}' not found. Aborting.")
    return seat_layout


async def seed_trips(session, route: Route, seat_layout: SeatLayout) -> tuple[int, int]:
    created = 0
    skipped = 0

    today = date.today()
    for offset in range(TRIP_WINDOW_DAYS):
        day = today + timedelta(days=offset)
        if day.weekday() != SUNDAY:
            continue

        departure_at = datetime(day.year, day.month, day.day, DEPARTURE_HOUR, 0, tzinfo=ART)
        arrival_at = departure_at + timedelta(hours=TRIP_DURATION_HOURS)

        result = await session.execute(
            select(Trip).where(Trip.route_id == route.id, Trip.departure_at == departure_at)
        )
        if result.scalar_one_or_none() is not None:
            skipped += 1
            continue

        session.add(
            Trip(
                route_id=route.id,
                seat_layout_id=seat_layout.id,
                departure_at=departure_at,
                arrival_at=arrival_at,
                status=TripStatusEnum.scheduled,
            )
        )
        created += 1

    return created, skipped


async def seed_routes_and_trips() -> None:
    async with AsyncSessionLocal() as session:
        route, route_created = await seed_route(session)
        route_stops_count = await seed_route_stops(session, route)
        seat_layout = await get_seat_layout(session)
        trips_created, trips_skipped = await seed_trips(session, route, seat_layout)
        await session.commit()

    print(f"Route: {'created' if route_created else 'already existed'} ({route.id})")
    print(f"Route stops: {route_stops_count} inserted")
    print(f"SeatLayout: found ({seat_layout.name}, {seat_layout.id})")
    print(f"Trips: {trips_created} created, {trips_skipped} skipped (already existed)")


if __name__ == "__main__":
    asyncio.run(seed_routes_and_trips())
