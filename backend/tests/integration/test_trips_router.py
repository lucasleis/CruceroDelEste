"""Integration tests for app/routers/trips.py."""

import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trip import (
    PriceTranche,
    Route,
    Seat,
    SeatStatusEnum,
    SeatTypeEnum,
    Trip,
    TripStatusEnum,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _make_route(
    db: AsyncSession,
    origin: str = "Buenos Aires",
    destination: str = "Rosario",
) -> Route:
    route = Route(origin=origin, destination=destination)
    db.add(route)
    await db.flush()
    return route


async def _make_trip(
    db: AsyncSession,
    route: Route,
    *,
    departure_offset_days: int = 1,
    status: TripStatusEnum = TripStatusEnum.scheduled,
) -> Trip:
    now = datetime.now(timezone.utc)
    trip = Trip(
        route_id=route.id,
        departure_at=now + timedelta(days=departure_offset_days),
        arrival_at=now + timedelta(days=departure_offset_days, hours=4),
        status=status,
    )
    db.add(trip)
    await db.flush()
    return trip


async def _make_seat(
    db: AsyncSession,
    trip: Trip,
    seat_number: str,
    *,
    seat_type: SeatTypeEnum = SeatTypeEnum.cama,
    status: SeatStatusEnum = SeatStatusEnum.available,
) -> Seat:
    seat = Seat(
        trip_id=trip.id,
        seat_number=seat_number,
        seat_type=seat_type,
        status=status,
    )
    db.add(seat)
    await db.flush()
    return seat


async def _add_tranche(
    db: AsyncSession,
    trip: Trip,
    seat_type: SeatTypeEnum = SeatTypeEnum.cama,
    *,
    min_sold: int = 0,
    max_sold: int = 100,
    price: int = 24500,
) -> PriceTranche:
    tranche = PriceTranche(
        trip_id=trip.id,
        seat_type=seat_type,
        min_sold=min_sold,
        max_sold=max_sold,
        price=price,
    )
    db.add(tranche)
    await db.flush()
    return tranche


# ---------------------------------------------------------------------------
# GET /trips
# ---------------------------------------------------------------------------

async def test_list_trips_empty(client: AsyncClient):
    resp = await client.get("/trips")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_trips_one_trip_shape(client: AsyncClient, db: AsyncSession):
    route = await _make_route(db)
    trip = await _make_trip(db, route)
    await _make_seat(db, trip, "1A", seat_type=SeatTypeEnum.cama)
    await _add_tranche(db, trip, SeatTypeEnum.cama, price=24500)

    resp = await client.get("/trips")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1

    t = data[0]
    assert t["route"]["origin"] == "Buenos Aires"
    assert t["route"]["destination"] == "Rosario"
    assert t["status"] == "scheduled"
    assert t["available_seats_count"] == 1
    assert t["current_price_cama"] == 24500
    assert t["current_price_semi_cama"] is None
    assert "id" in t
    assert "departure_at" in t
    assert "arrival_at" in t


async def test_list_trips_excludes_past_trips(client: AsyncClient, db: AsyncSession):
    route = await _make_route(db)
    now = datetime.now(timezone.utc)
    past_trip = Trip(
        route_id=route.id,
        departure_at=now - timedelta(hours=1),
        arrival_at=now + timedelta(hours=3),
        status=TripStatusEnum.scheduled,
    )
    db.add(past_trip)
    await db.flush()

    resp = await client.get("/trips")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_trips_excludes_non_scheduled_trips(client: AsyncClient, db: AsyncSession):
    route = await _make_route(db)
    trip = await _make_trip(db, route, status=TripStatusEnum.cancelled)
    await _add_tranche(db, trip, SeatTypeEnum.cama)

    resp = await client.get("/trips")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_trips_available_count_excludes_non_available_seats(
    client: AsyncClient, db: AsyncSession
):
    route = await _make_route(db)
    trip = await _make_trip(db, route)
    await _make_seat(db, trip, "1A", status=SeatStatusEnum.available)
    await _make_seat(db, trip, "2A", status=SeatStatusEnum.sold)
    await _make_seat(db, trip, "3A", status=SeatStatusEnum.reserved)
    await _add_tranche(db, trip, SeatTypeEnum.cama)

    resp = await client.get("/trips")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["available_seats_count"] == 1


async def test_list_trips_filter_by_origin(client: AsyncClient, db: AsyncSession):
    route_ba = await _make_route(db, origin="Buenos Aires", destination="Rosario")
    route_mza = await _make_route(db, origin="Mendoza", destination="Rosario")

    trip_ba = await _make_trip(db, route_ba)
    trip_mza = await _make_trip(db, route_mza)
    await _add_tranche(db, trip_ba, SeatTypeEnum.cama)
    await _add_tranche(db, trip_mza, SeatTypeEnum.cama)

    resp = await client.get("/trips", params={"origin": "Buenos Aires"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["route"]["origin"] == "Buenos Aires"


async def test_list_trips_filter_by_destination(client: AsyncClient, db: AsyncSession):
    route_to_rosario = await _make_route(db, origin="Buenos Aires", destination="Rosario")
    route_to_cordoba = await _make_route(db, origin="Buenos Aires", destination="Córdoba")

    trip_rosario = await _make_trip(db, route_to_rosario)
    trip_cordoba = await _make_trip(db, route_to_cordoba)
    await _add_tranche(db, trip_rosario, SeatTypeEnum.cama)
    await _add_tranche(db, trip_cordoba, SeatTypeEnum.cama)

    resp = await client.get("/trips", params={"destination": "Rosario"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["route"]["destination"] == "Rosario"


async def test_list_trips_filter_by_departure_date(client: AsyncClient, db: AsyncSession):
    route = await _make_route(db)
    now = datetime.now(timezone.utc)

    trip_tomorrow = await _make_trip(db, route, departure_offset_days=1)
    trip_later = await _make_trip(db, route, departure_offset_days=5)
    await _add_tranche(db, trip_tomorrow, SeatTypeEnum.cama)
    await _add_tranche(db, trip_later, SeatTypeEnum.cama)

    tomorrow = (now + timedelta(days=1)).date()
    resp = await client.get("/trips", params={"departure_date": str(tomorrow)})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1


# ---------------------------------------------------------------------------
# GET /trips/{id}/seats
# ---------------------------------------------------------------------------

async def test_get_trip_seats_404_nonexistent_trip(client: AsyncClient):
    resp = await client.get(f"/trips/{uuid.uuid4()}/seats")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


async def test_get_trip_seats_empty_when_no_seats(client: AsyncClient, db: AsyncSession):
    route = await _make_route(db)
    trip = await _make_trip(db, route)

    resp = await client.get(f"/trips/{trip.id}/seats")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_get_trip_seats_shape(client: AsyncClient, db: AsyncSession):
    route = await _make_route(db)
    trip = await _make_trip(db, route)
    await _make_seat(db, trip, "1A", seat_type=SeatTypeEnum.cama)
    await _make_seat(db, trip, "2A", seat_type=SeatTypeEnum.semi_cama)

    resp = await client.get(f"/trips/{trip.id}/seats")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2

    seat = data[0]
    assert set(seat.keys()) == {"id", "seat_number", "seat_type", "status"}
    assert seat["seat_number"] == "1A"
    assert seat["status"] == "available"


async def test_get_trip_seats_filter_by_type(client: AsyncClient, db: AsyncSession):
    route = await _make_route(db)
    trip = await _make_trip(db, route)
    await _make_seat(db, trip, "1A", seat_type=SeatTypeEnum.cama)
    await _make_seat(db, trip, "2A", seat_type=SeatTypeEnum.semi_cama)

    resp = await client.get(f"/trips/{trip.id}/seats", params={"seat_type": "cama"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["seat_type"] == "cama"


async def test_get_trip_seats_filter_by_status(client: AsyncClient, db: AsyncSession):
    route = await _make_route(db)
    trip = await _make_trip(db, route)
    await _make_seat(db, trip, "1A", status=SeatStatusEnum.available)
    await _make_seat(db, trip, "2A", status=SeatStatusEnum.sold)

    resp = await client.get(f"/trips/{trip.id}/seats", params={"status": "available"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["status"] == "available"


async def test_get_trip_seats_ordered_by_seat_number(client: AsyncClient, db: AsyncSession):
    route = await _make_route(db)
    trip = await _make_trip(db, route)
    await _make_seat(db, trip, "3A")
    await _make_seat(db, trip, "1A")
    await _make_seat(db, trip, "2A")

    resp = await client.get(f"/trips/{trip.id}/seats")
    assert resp.status_code == 200
    numbers = [s["seat_number"] for s in resp.json()]
    assert numbers == ["1A", "2A", "3A"]
