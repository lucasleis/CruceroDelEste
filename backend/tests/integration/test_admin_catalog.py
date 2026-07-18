"""Integration tests for app/routers/admin_catalog.py."""

import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import AdminUser, Booking, BookingStatusEnum, Passenger
from app.models.trip import (
    CountryEnum,
    Route,
    Seat,
    SeatLayout,
    SeatLayoutSeat,
    SeatStatusEnum,
    SeatTypeEnum,
    Stop,
    Trip,
    TripStatusEnum,
)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _make_admin(db: AsyncSession) -> AdminUser:
    admin = AdminUser(
        email="admin@test.com",
        password_hash=_pwd_context.hash("secret"),
    )
    db.add(admin)
    await db.flush()
    return admin


async def _login(client: AsyncClient) -> str:
    resp = await client.post(
        "/admin/login", json={"email": "admin@test.com", "password": "secret"}
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _make_stops(db: AsyncSession) -> tuple[Stop, Stop]:
    origin = Stop(name="Retiro", country=CountryEnum.AR)
    destination = Stop(name="Asunción", country=CountryEnum.PY)
    db.add(origin)
    db.add(destination)
    await db.flush()
    return origin, destination


async def _make_route(db: AsyncSession, origin: Stop, destination: Stop) -> Route:
    route = Route(origin_stop_id=origin.id, destination_stop_id=destination.id)
    db.add(route)
    await db.flush()
    return route


async def _make_layout(
    db: AsyncSession,
    *,
    name: str = "Cama 20 / Semi Cama 10",
    total_cama: int = 20,
    total_semi_cama: int = 10,
) -> SeatLayout:
    layout = SeatLayout(name=name, total_cama=total_cama, total_semi_cama=total_semi_cama)
    db.add(layout)
    await db.flush()

    order = 0
    for i in range(1, total_cama + 1):
        db.add(SeatLayoutSeat(
            seat_layout_id=layout.id,
            seat_number=f"C{i:02d}",
            seat_type=SeatTypeEnum.cama,
            display_order=order,
        ))
        order += 1
    for i in range(1, total_semi_cama + 1):
        db.add(SeatLayoutSeat(
            seat_layout_id=layout.id,
            seat_number=f"S{i:02d}",
            seat_type=SeatTypeEnum.semi_cama,
            display_order=order,
        ))
        order += 1
    await db.flush()
    return layout


async def _make_trip(db: AsyncSession, route: Route, layout: SeatLayout | None = None) -> Trip:
    now = datetime.now(timezone.utc)
    trip = Trip(
        route_id=route.id,
        seat_layout_id=layout.id if layout is not None else None,
        departure_at=now + timedelta(days=1),
        arrival_at=now + timedelta(days=1, hours=16),
        status=TripStatusEnum.scheduled,
    )
    db.add(trip)
    await db.flush()
    return trip


async def _make_confirmed_booking(db: AsyncSession, trip: Trip) -> Booking:
    seat = Seat(
        trip_id=trip.id,
        seat_number="C01",
        seat_type=SeatTypeEnum.cama,
        status=SeatStatusEnum.sold,
    )
    db.add(seat)
    await db.flush()

    now = datetime.now(timezone.utc)
    booking = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.confirmed,
        contact_email="buyer@example.com",
        total_amount=24500,
        expires_at=now + timedelta(minutes=15),
        confirmed_at=now,
    )
    db.add(booking)
    await db.flush()

    db.add(Passenger(
        booking_id=booking.id,
        seat_id=seat.id,
        first_name="Ana",
        last_name="García",
        dni="12345678",
        email="ana@example.com",
    ))
    await db.flush()
    return booking


# ---------------------------------------------------------------------------
# GET /admin/seat-layouts
# ---------------------------------------------------------------------------


async def test_list_seat_layouts_empty(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    token = await _login(client)

    resp = await client.get("/admin/seat-layouts", headers=_auth(token))

    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_seat_layouts_returns_correct_shape(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    layout = await _make_layout(db, name="Cama 40 / Semi Cama 20", total_cama=40, total_semi_cama=20)
    await db.commit()
    token = await _login(client)

    resp = await client.get("/admin/seat-layouts", headers=_auth(token))

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == str(layout.id)
    assert data[0]["name"] == "Cama 40 / Semi Cama 20"
    assert data[0]["total_cama"] == 40
    assert data[0]["total_semi_cama"] == 20
    assert data[0]["description"] is None


async def test_list_seat_layouts_ordered_by_name(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    await _make_layout(db, name="Cama Z", total_cama=5, total_semi_cama=5)
    await _make_layout(db, name="Cama A", total_cama=10, total_semi_cama=5)
    await db.commit()
    token = await _login(client)

    resp = await client.get("/admin/seat-layouts", headers=_auth(token))

    assert resp.status_code == 200
    names = [l["name"] for l in resp.json()]
    assert names == ["Cama A", "Cama Z"]


async def test_list_seat_layouts_no_auth_returns_401(client: AsyncClient):
    resp = await client.get("/admin/seat-layouts")

    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /admin/stops
# ---------------------------------------------------------------------------


async def test_create_stop_happy_path_returns_201(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    token = await _login(client)

    resp = await client.post(
        "/admin/stops",
        headers=_auth(token),
        json={"name": "Retiro", "country": "AR"},
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Retiro"
    assert data["country"] == "AR"
    assert "id" in data


async def test_create_stop_duplicate_name_returns_409(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, _ = await _make_stops(db)
    await db.commit()
    token = await _login(client)

    resp = await client.post(
        "/admin/stops",
        headers=_auth(token),
        json={"name": "Retiro", "country": "PY"},
    )

    assert resp.status_code == 409
    assert resp.json()["detail"] == "stop_name_conflict"


async def test_create_stop_no_auth_returns_401(client: AsyncClient):
    resp = await client.post("/admin/stops", json={"name": "Retiro", "country": "AR"})

    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /admin/stops/{id}
# ---------------------------------------------------------------------------


async def test_update_stop_name_returns_200(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, _ = await _make_stops(db)
    await db.commit()
    token = await _login(client)

    resp = await client.patch(
        f"/admin/stops/{origin.id}",
        headers=_auth(token),
        json={"name": "Constitución"},
    )

    assert resp.status_code == 200
    assert resp.json()["name"] == "Constitución"
    assert resp.json()["country"] == "AR"


async def test_update_stop_country_without_routes_returns_200(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    origin, _ = await _make_stops(db)
    await db.commit()
    token = await _login(client)

    resp = await client.patch(
        f"/admin/stops/{origin.id}",
        headers=_auth(token),
        json={"country": "PY"},
    )

    assert resp.status_code == 200
    assert resp.json()["country"] == "PY"


async def test_update_stop_country_with_routes_returns_409(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    await _make_route(db, origin, destination)
    await db.commit()
    token = await _login(client)

    resp = await client.patch(
        f"/admin/stops/{origin.id}",
        headers=_auth(token),
        json={"country": "PY"},
    )

    assert resp.status_code == 409
    assert resp.json()["detail"] == "stop_in_use"


async def test_update_stop_name_duplicate_returns_409(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    await db.commit()
    token = await _login(client)

    resp = await client.patch(
        f"/admin/stops/{origin.id}",
        headers=_auth(token),
        json={"name": "Asunción"},
    )

    assert resp.status_code == 409
    assert resp.json()["detail"] == "stop_name_conflict"


async def test_update_stop_not_found_returns_404(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    token = await _login(client)

    resp = await client.patch(
        f"/admin/stops/{uuid.uuid4()}",
        headers=_auth(token),
        json={"name": "Nowhere"},
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


# ---------------------------------------------------------------------------
# DELETE /admin/stops/{id}
# ---------------------------------------------------------------------------


async def test_delete_stop_happy_path_returns_204(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, _ = await _make_stops(db)
    await db.commit()
    token = await _login(client)

    resp = await client.delete(f"/admin/stops/{origin.id}", headers=_auth(token))

    assert resp.status_code == 204
    assert resp.content == b""


async def test_delete_stop_with_routes_returns_409(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    await _make_route(db, origin, destination)
    await db.commit()
    token = await _login(client)

    resp = await client.delete(f"/admin/stops/{origin.id}", headers=_auth(token))

    assert resp.status_code == 409
    assert resp.json()["detail"] == "stop_in_use"


async def test_delete_stop_not_found_returns_404(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    token = await _login(client)

    resp = await client.delete(f"/admin/stops/{uuid.uuid4()}", headers=_auth(token))

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


# ---------------------------------------------------------------------------
# GET /admin/routes
# ---------------------------------------------------------------------------


async def test_list_routes_empty(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    token = await _login(client)

    resp = await client.get("/admin/routes", headers=_auth(token))

    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_routes_returns_correct_shape(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    await db.commit()
    token = await _login(client)

    resp = await client.get("/admin/routes", headers=_auth(token))

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    r = data[0]
    assert r["id"] == str(route.id)
    assert r["origin_stop"]["name"] == "Retiro"
    assert r["origin_stop"]["country"] == "AR"
    assert r["destination_stop"]["name"] == "Asunción"
    assert r["destination_stop"]["country"] == "PY"


# ---------------------------------------------------------------------------
# POST /admin/routes
# ---------------------------------------------------------------------------


async def test_create_route_happy_path_returns_201(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    await db.commit()
    token = await _login(client)

    resp = await client.post(
        "/admin/routes",
        headers=_auth(token),
        json={
            "origin_stop_id": str(origin.id),
            "destination_stop_id": str(destination.id),
        },
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["origin_stop"]["id"] == str(origin.id)
    assert data["destination_stop"]["id"] == str(destination.id)
    assert "id" in data


async def test_create_route_same_country_returns_422(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    stop_a = Stop(name="Buenos Aires", country=CountryEnum.AR)
    stop_b = Stop(name="Córdoba", country=CountryEnum.AR)
    db.add(stop_a)
    db.add(stop_b)
    await db.commit()
    token = await _login(client)

    resp = await client.post(
        "/admin/routes",
        headers=_auth(token),
        json={
            "origin_stop_id": str(stop_a.id),
            "destination_stop_id": str(stop_b.id),
        },
    )

    assert resp.status_code == 422
    assert resp.json()["detail"] == "international_route_required"


async def test_create_route_duplicate_returns_409(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    await _make_route(db, origin, destination)
    await db.commit()
    token = await _login(client)

    resp = await client.post(
        "/admin/routes",
        headers=_auth(token),
        json={
            "origin_stop_id": str(origin.id),
            "destination_stop_id": str(destination.id),
        },
    )

    assert resp.status_code == 409
    assert resp.json()["detail"] == "route_already_exists"


async def test_create_route_invalid_origin_returns_404(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    _, destination = await _make_stops(db)
    await db.commit()
    token = await _login(client)

    resp = await client.post(
        "/admin/routes",
        headers=_auth(token),
        json={
            "origin_stop_id": str(uuid.uuid4()),
            "destination_stop_id": str(destination.id),
        },
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


async def test_create_route_invalid_destination_returns_404(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    origin, _ = await _make_stops(db)
    await db.commit()
    token = await _login(client)

    resp = await client.post(
        "/admin/routes",
        headers=_auth(token),
        json={
            "origin_stop_id": str(origin.id),
            "destination_stop_id": str(uuid.uuid4()),
        },
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


# ---------------------------------------------------------------------------
# DELETE /admin/routes/{id}
# ---------------------------------------------------------------------------


async def test_delete_route_happy_path_returns_204(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    await db.commit()
    token = await _login(client)

    resp = await client.delete(f"/admin/routes/{route.id}", headers=_auth(token))

    assert resp.status_code == 204
    assert resp.content == b""


async def test_delete_route_with_trips_returns_409(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)
    await _make_trip(db, route, layout)
    await db.commit()
    token = await _login(client)

    resp = await client.delete(f"/admin/routes/{route.id}", headers=_auth(token))

    assert resp.status_code == 409
    assert resp.json()["detail"] == "route_in_use"


async def test_delete_route_not_found_returns_404(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    token = await _login(client)

    resp = await client.delete(f"/admin/routes/{uuid.uuid4()}", headers=_auth(token))

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


# ---------------------------------------------------------------------------
# GET /admin/trips
# ---------------------------------------------------------------------------


async def test_list_admin_trips_empty(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    token = await _login(client)

    resp = await client.get("/admin/trips", headers=_auth(token))

    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_admin_trips_returns_all_statuses(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)

    now = datetime.now(timezone.utc)
    trip_scheduled = Trip(
        route_id=route.id,
        departure_at=now + timedelta(days=1),
        arrival_at=now + timedelta(days=1, hours=16),
        status=TripStatusEnum.scheduled,
    )
    trip_cancelled = Trip(
        route_id=route.id,
        departure_at=now - timedelta(days=2),
        arrival_at=now - timedelta(days=1),
        status=TripStatusEnum.cancelled,
    )
    db.add(trip_scheduled)
    db.add(trip_cancelled)
    await db.commit()
    token = await _login(client)

    resp = await client.get("/admin/trips", headers=_auth(token))

    assert resp.status_code == 200
    assert len(resp.json()) == 2


async def test_list_admin_trips_returns_correct_shape(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)
    trip = await _make_trip(db, route, layout)
    await db.commit()
    token = await _login(client)

    resp = await client.get("/admin/trips", headers=_auth(token))

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    t = data[0]
    assert t["id"] == str(trip.id)
    assert t["status"] == "scheduled"
    assert t["seat_layout_id"] == str(layout.id)
    assert t["route"]["origin_stop"]["name"] == "Retiro"
    assert t["route"]["destination_stop"]["name"] == "Asunción"
    assert "departure_at" in t
    assert "arrival_at" in t
    assert "created_at" in t


# ---------------------------------------------------------------------------
# GET /admin/trips/{id}
# ---------------------------------------------------------------------------


async def test_get_admin_trip_returns_200(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)
    trip = await _make_trip(db, route, layout)
    await db.commit()
    token = await _login(client)

    resp = await client.get(f"/admin/trips/{trip.id}", headers=_auth(token))

    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(trip.id)
    assert data["seat_layout_id"] == str(layout.id)


async def test_get_admin_trip_not_found_returns_404(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    token = await _login(client)

    resp = await client.get(f"/admin/trips/{uuid.uuid4()}", headers=_auth(token))

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


# ---------------------------------------------------------------------------
# POST /admin/trips
# ---------------------------------------------------------------------------


async def test_create_trip_happy_path_returns_201(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db, total_cama=3, total_semi_cama=2)
    await db.commit()
    token = await _login(client)

    now = datetime.now(timezone.utc)
    resp = await client.post(
        "/admin/trips",
        headers=_auth(token),
        json={
            "route_id": str(route.id),
            "seat_layout_id": str(layout.id),
            "departure_at": (now + timedelta(days=2)).isoformat(),
            "arrival_at": (now + timedelta(days=2, hours=16)).isoformat(),
        },
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "scheduled"
    assert data["seat_layout_id"] == str(layout.id)
    assert data["route"]["origin_stop"]["name"] == "Retiro"


async def test_create_trip_auto_generates_seats(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db, total_cama=3, total_semi_cama=2)
    await db.commit()
    token = await _login(client)

    now = datetime.now(timezone.utc)
    resp = await client.post(
        "/admin/trips",
        headers=_auth(token),
        json={
            "route_id": str(route.id),
            "seat_layout_id": str(layout.id),
            "departure_at": (now + timedelta(days=2)).isoformat(),
            "arrival_at": (now + timedelta(days=2, hours=16)).isoformat(),
        },
    )

    assert resp.status_code == 201
    trip_id = resp.json()["id"]

    # Verify seats via GET /trips/{id}/seats
    seats_resp = await client.get(f"/trips/{trip_id}/seats")
    assert seats_resp.status_code == 200
    seats = seats_resp.json()
    assert len(seats) == 5  # 3 cama + 2 semi_cama

    cama_seats = [s for s in seats if s["seat_type"] == "cama"]
    semi_seats = [s for s in seats if s["seat_type"] == "semi_cama"]
    assert len(cama_seats) == 3
    assert len(semi_seats) == 2
    assert [s["seat_number"] for s in cama_seats] == ["C01", "C02", "C03"]
    assert [s["seat_number"] for s in semi_seats] == ["S01", "S02"]


async def test_create_trip_departure_in_past_returns_422(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)
    await db.commit()
    token = await _login(client)

    now = datetime.now(timezone.utc)
    resp = await client.post(
        "/admin/trips",
        headers=_auth(token),
        json={
            "route_id": str(route.id),
            "seat_layout_id": str(layout.id),
            "departure_at": (now - timedelta(hours=1)).isoformat(),
            "arrival_at": (now + timedelta(hours=15)).isoformat(),
        },
    )

    assert resp.status_code == 422
    assert resp.json()["detail"] == "departure_in_past"


async def test_create_trip_arrival_before_departure_returns_422(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)
    await db.commit()
    token = await _login(client)

    now = datetime.now(timezone.utc)
    resp = await client.post(
        "/admin/trips",
        headers=_auth(token),
        json={
            "route_id": str(route.id),
            "seat_layout_id": str(layout.id),
            "departure_at": (now + timedelta(days=2)).isoformat(),
            "arrival_at": (now + timedelta(days=1)).isoformat(),
        },
    )

    assert resp.status_code == 422
    assert resp.json()["detail"] == "arrival_before_departure"


async def test_create_trip_invalid_route_returns_404(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    layout = await _make_layout(db)
    await db.commit()
    token = await _login(client)

    now = datetime.now(timezone.utc)
    resp = await client.post(
        "/admin/trips",
        headers=_auth(token),
        json={
            "route_id": str(uuid.uuid4()),
            "seat_layout_id": str(layout.id),
            "departure_at": (now + timedelta(days=2)).isoformat(),
            "arrival_at": (now + timedelta(days=2, hours=16)).isoformat(),
        },
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


async def test_create_trip_invalid_layout_returns_404(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    await db.commit()
    token = await _login(client)

    now = datetime.now(timezone.utc)
    resp = await client.post(
        "/admin/trips",
        headers=_auth(token),
        json={
            "route_id": str(route.id),
            "seat_layout_id": str(uuid.uuid4()),
            "departure_at": (now + timedelta(days=2)).isoformat(),
            "arrival_at": (now + timedelta(days=2, hours=16)).isoformat(),
        },
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


# ---------------------------------------------------------------------------
# PATCH /admin/trips/{id}
# ---------------------------------------------------------------------------


async def test_update_trip_status_returns_200(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)
    trip = await _make_trip(db, route, layout)
    await db.commit()
    token = await _login(client)

    resp = await client.patch(
        f"/admin/trips/{trip.id}",
        headers=_auth(token),
        json={"status": "cancelled"},
    )

    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"


async def test_update_trip_departure_at_returns_200(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)
    trip = await _make_trip(db, route, layout)
    await db.commit()
    token = await _login(client)

    now = datetime.now(timezone.utc)
    new_departure = (now + timedelta(days=5)).isoformat()
    new_arrival = (now + timedelta(days=5, hours=16)).isoformat()

    resp = await client.patch(
        f"/admin/trips/{trip.id}",
        headers=_auth(token),
        json={"departure_at": new_departure, "arrival_at": new_arrival},
    )

    assert resp.status_code == 200


async def test_update_trip_cancel_with_confirmed_bookings_returns_409(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)
    trip = await _make_trip(db, route, layout)
    await _make_confirmed_booking(db, trip)
    await db.commit()
    token = await _login(client)

    resp = await client.patch(
        f"/admin/trips/{trip.id}",
        headers=_auth(token),
        json={"status": "cancelled"},
    )

    assert resp.status_code == 409
    assert resp.json()["detail"] == "trip_has_confirmed_bookings"


async def test_update_trip_arrival_before_departure_returns_422(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)
    trip = await _make_trip(db, route, layout)
    await db.commit()
    token = await _login(client)

    now = datetime.now(timezone.utc)
    resp = await client.patch(
        f"/admin/trips/{trip.id}",
        headers=_auth(token),
        json={
            "departure_at": (now + timedelta(days=5)).isoformat(),
            "arrival_at": (now + timedelta(days=4)).isoformat(),
        },
    )

    assert resp.status_code == 422
    assert resp.json()["detail"] == "arrival_before_departure"


async def test_update_trip_not_found_returns_404(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    token = await _login(client)

    resp = await client.patch(
        f"/admin/trips/{uuid.uuid4()}",
        headers=_auth(token),
        json={"status": "cancelled"},
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


# ---------------------------------------------------------------------------
# DELETE /admin/trips/{id}
# ---------------------------------------------------------------------------


async def test_delete_trip_happy_path_returns_204(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)
    trip = await _make_trip(db, route, layout)
    await db.commit()
    token = await _login(client)

    resp = await client.delete(f"/admin/trips/{trip.id}", headers=_auth(token))

    assert resp.status_code == 204
    assert resp.content == b""


async def test_delete_trip_with_bookings_returns_409(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    origin, destination = await _make_stops(db)
    route = await _make_route(db, origin, destination)
    layout = await _make_layout(db)
    trip = await _make_trip(db, route, layout)
    await _make_confirmed_booking(db, trip)
    await db.commit()
    token = await _login(client)

    resp = await client.delete(f"/admin/trips/{trip.id}", headers=_auth(token))

    assert resp.status_code == 409
    assert resp.json()["detail"] == "trip_has_bookings"


async def test_delete_trip_not_found_returns_404(client: AsyncClient, db: AsyncSession):
    await _make_admin(db)
    token = await _login(client)

    resp = await client.delete(f"/admin/trips/{uuid.uuid4()}", headers=_auth(token))

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"
