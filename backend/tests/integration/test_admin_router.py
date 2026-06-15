"""Integration tests for app/routers/admin.py."""

import uuid
from datetime import datetime, timedelta, timezone

from httpx import AsyncClient
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import AdminUser, Booking, BookingStatusEnum, Passenger
from app.models.trip import (
    PriceTranche,
    Route,
    Seat,
    SeatStatusEnum,
    SeatTypeEnum,
    Trip,
    TripStatusEnum,
)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _make_admin(
    db: AsyncSession,
    email: str = "admin@test.com",
    password: str = "secret",
) -> AdminUser:
    admin = AdminUser(
        email=email,
        password_hash=_pwd_context.hash(password),
    )
    db.add(admin)
    await db.flush()
    return admin


async def _login(client: AsyncClient, email: str, password: str) -> str:
    resp = await client.post("/admin/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _make_trip(db: AsyncSession) -> Trip:
    route = Route(origin="Buenos Aires", destination="Rosario")
    db.add(route)
    await db.flush()
    now = datetime.now(timezone.utc)
    trip = Trip(
        route_id=route.id,
        departure_at=now + timedelta(days=1),
        arrival_at=now + timedelta(days=1, hours=4),
        status=TripStatusEnum.scheduled,
    )
    db.add(trip)
    await db.flush()
    return trip


async def _make_tranche(
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


async def _make_booking_with_passenger(db: AsyncSession, trip: Trip) -> Booking:
    seat = Seat(
        trip_id=trip.id,
        seat_number="1A",
        seat_type=SeatTypeEnum.cama,
        status=SeatStatusEnum.reserved,
    )
    db.add(seat)
    await db.flush()

    now = datetime.now(timezone.utc)
    booking = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.pending_payment,
        total_amount=24500,
        expires_at=now + timedelta(minutes=15),
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
# POST /admin/login
# ---------------------------------------------------------------------------

async def test_login_valid_credentials_returns_token(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db, email="admin@test.com", password="secret")

    resp = await client.post(
        "/admin/login",
        json={"email": "admin@test.com", "password": "secret"},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)
    assert len(data["access_token"]) > 0


async def test_login_wrong_password_returns_401(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db, email="admin@test.com", password="correct")

    resp = await client.post(
        "/admin/login",
        json={"email": "admin@test.com", "password": "wrong"},
    )

    assert resp.status_code == 401
    assert resp.json()["detail"] == "invalid_credentials"


async def test_login_nonexistent_email_returns_401(client: AsyncClient):
    resp = await client.post(
        "/admin/login",
        json={"email": "nobody@test.com", "password": "secret"},
    )

    assert resp.status_code == 401
    assert resp.json()["detail"] == "invalid_credentials"


async def test_login_token_grants_access_to_protected_endpoint(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.get("/admin/bookings", headers=_auth(token))

    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Authentication — shared behaviour across all protected endpoints
# ---------------------------------------------------------------------------

async def test_protected_endpoint_no_auth_returns_401(client: AsyncClient):
    # HTTPBearer raises 401 when the Authorization header is absent.
    resp = await client.get("/admin/bookings")

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Not authenticated"


async def test_protected_endpoint_invalid_token_returns_401(client: AsyncClient):
    resp = await client.get(
        "/admin/bookings",
        headers={"Authorization": "Bearer not.a.valid.jwt"},
    )

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid or expired token"


# ---------------------------------------------------------------------------
# GET /admin/bookings
# ---------------------------------------------------------------------------

async def test_list_bookings_empty_returns_200(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.get("/admin/bookings", headers=_auth(token))

    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_bookings_returns_correct_shape(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip = await _make_trip(db)
    booking = await _make_booking_with_passenger(db, trip)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.get("/admin/bookings", headers=_auth(token))

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1

    b = data[0]
    assert b["id"] == str(booking.id)
    assert b["trip_id"] == str(trip.id)
    assert b["status"] == "pending_payment"
    assert b["total_amount"] == 24500
    assert b["mp_preference_id"] is None
    assert b["mp_payment_id"] is None
    assert b["confirmed_at"] is None
    assert b["reminder_sent"] is False
    assert b["feedback_sent"] is False
    assert "expires_at" in b
    assert "created_at" in b

    assert len(b["passengers"]) == 1
    pax = b["passengers"][0]
    assert pax["first_name"] == "Ana"
    assert pax["email"] == "ana@example.com"


async def test_list_bookings_no_auth_returns_401(client: AsyncClient):
    resp = await client.get("/admin/bookings")

    assert resp.status_code == 401


async def test_list_bookings_filter_by_status(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip = await _make_trip(db)

    now = datetime.now(timezone.utc)
    seat_a = Seat(trip_id=trip.id, seat_number="1A", seat_type=SeatTypeEnum.cama, status=SeatStatusEnum.reserved)
    seat_b = Seat(trip_id=trip.id, seat_number="2A", seat_type=SeatTypeEnum.cama, status=SeatStatusEnum.sold)
    db.add(seat_a)
    db.add(seat_b)
    await db.flush()

    booking_pending = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.pending_payment,
        total_amount=24500,
        expires_at=now + timedelta(minutes=15),
    )
    booking_confirmed = Booking(
        trip_id=trip.id,
        status=BookingStatusEnum.confirmed,
        total_amount=24500,
        expires_at=now + timedelta(minutes=15),
        confirmed_at=now,
    )
    db.add(booking_pending)
    db.add(booking_confirmed)
    await db.flush()

    db.add(Passenger(booking_id=booking_pending.id, seat_id=seat_a.id,
                     first_name="A", last_name="B", dni="1", email="a@a.com"))
    db.add(Passenger(booking_id=booking_confirmed.id, seat_id=seat_b.id,
                     first_name="C", last_name="D", dni="2", email="c@c.com"))
    await db.flush()

    token = await _login(client, "admin@test.com", "secret")

    resp = await client.get(
        "/admin/bookings",
        headers=_auth(token),
        params={"booking_status": "confirmed"},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["status"] == "confirmed"


async def test_list_bookings_filter_by_trip_id(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip_a = await _make_trip(db)
    # Second trip on a different route
    route_b = Route(origin="Rosario", destination="Córdoba")
    db.add(route_b)
    await db.flush()
    now = datetime.now(timezone.utc)
    trip_b = Trip(
        route_id=route_b.id,
        departure_at=now + timedelta(days=2),
        arrival_at=now + timedelta(days=2, hours=4),
        status=TripStatusEnum.scheduled,
    )
    db.add(trip_b)
    await db.flush()

    booking_a = await _make_booking_with_passenger(db, trip_a)
    booking_b = await _make_booking_with_passenger(db, trip_b)

    token = await _login(client, "admin@test.com", "secret")

    resp = await client.get(
        "/admin/bookings",
        headers=_auth(token),
        params={"trip_id": str(trip_a.id)},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["trip_id"] == str(trip_a.id)


# ---------------------------------------------------------------------------
# GET /admin/trips/{trip_id}/price-tranches
# ---------------------------------------------------------------------------

async def test_list_price_tranches_no_auth_returns_401(client: AsyncClient):
    resp = await client.get(f"/admin/trips/{uuid.uuid4()}/price-tranches")

    assert resp.status_code == 401


async def test_list_price_tranches_trip_not_found_returns_404(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.get(
        f"/admin/trips/{uuid.uuid4()}/price-tranches",
        headers=_auth(token),
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


async def test_list_price_tranches_empty_returns_200(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip = await _make_trip(db)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.get(
        f"/admin/trips/{trip.id}/price-tranches",
        headers=_auth(token),
    )

    assert resp.status_code == 200
    assert resp.json() == []


async def test_list_price_tranches_returns_correct_shape(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip = await _make_trip(db)
    tranche = await _make_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=50, price=24500)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.get(
        f"/admin/trips/{trip.id}/price-tranches",
        headers=_auth(token),
    )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1

    t = data[0]
    assert t["id"] == str(tranche.id)
    assert t["trip_id"] == str(trip.id)
    assert t["seat_type"] == "cama"
    assert t["min_sold"] == 0
    assert t["max_sold"] == 50
    assert t["price"] == 24500
    assert "created_at" in t


async def test_list_price_tranches_ordered_by_seat_type_then_min_sold(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip = await _make_trip(db)
    await _make_tranche(db, trip, SeatTypeEnum.semi_cama, min_sold=0, max_sold=50, price=23300)
    await _make_tranche(db, trip, SeatTypeEnum.cama, min_sold=50, max_sold=100, price=26000)
    await _make_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=50, price=24500)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.get(
        f"/admin/trips/{trip.id}/price-tranches",
        headers=_auth(token),
    )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3
    # ORDER BY seat_type ASC, min_sold ASC: cama[0,50), cama[50,100), semi_cama[0,50)
    assert data[0]["seat_type"] == "cama" and data[0]["min_sold"] == 0
    assert data[1]["seat_type"] == "cama" and data[1]["min_sold"] == 50
    assert data[2]["seat_type"] == "semi_cama" and data[2]["min_sold"] == 0


# ---------------------------------------------------------------------------
# POST /admin/trips/{trip_id}/price-tranches
# ---------------------------------------------------------------------------

async def test_create_price_tranche_no_auth_returns_401(client: AsyncClient):
    resp = await client.post(
        f"/admin/trips/{uuid.uuid4()}/price-tranches",
        json={"seat_type": "cama", "min_sold": 0, "max_sold": 100, "price": 24500},
    )

    assert resp.status_code == 401


async def test_create_price_tranche_trip_not_found_returns_404(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.post(
        f"/admin/trips/{uuid.uuid4()}/price-tranches",
        headers=_auth(token),
        json={"seat_type": "cama", "min_sold": 0, "max_sold": 100, "price": 24500},
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


async def test_create_price_tranche_happy_path_returns_201(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip = await _make_trip(db)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.post(
        f"/admin/trips/{trip.id}/price-tranches",
        headers=_auth(token),
        json={"seat_type": "cama", "min_sold": 0, "max_sold": 50, "price": 24500},
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["trip_id"] == str(trip.id)
    assert data["seat_type"] == "cama"
    assert data["min_sold"] == 0
    assert data["max_sold"] == 50
    assert data["price"] == 24500
    assert "id" in data
    assert "created_at" in data


async def test_create_price_tranche_overlap_returns_409(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip = await _make_trip(db)
    # Existing tranche: [0, 50)
    await _make_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=50, price=24500)
    token = await _login(client, "admin@test.com", "secret")

    # New tranche [25, 75) overlaps [0, 50): 25 < 50 AND 75 > 0 → True
    resp = await client.post(
        f"/admin/trips/{trip.id}/price-tranches",
        headers=_auth(token),
        json={"seat_type": "cama", "min_sold": 25, "max_sold": 75, "price": 25000},
    )

    assert resp.status_code == 409
    assert resp.json()["detail"] == "tranche_overlap"


async def test_create_price_tranche_adjacent_ranges_do_not_overlap(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip = await _make_trip(db)
    await _make_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=50, price=24500)
    token = await _login(client, "admin@test.com", "secret")

    # [50, 100) starts exactly where [0, 50) ends — not an overlap
    resp = await client.post(
        f"/admin/trips/{trip.id}/price-tranches",
        headers=_auth(token),
        json={"seat_type": "cama", "min_sold": 50, "max_sold": 100, "price": 26000},
    )

    assert resp.status_code == 201


async def test_create_price_tranche_different_seat_type_does_not_conflict(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip = await _make_trip(db)
    # Existing cama [0, 50) — should NOT block semi_cama [0, 50)
    await _make_tranche(db, trip, SeatTypeEnum.cama, min_sold=0, max_sold=50, price=24500)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.post(
        f"/admin/trips/{trip.id}/price-tranches",
        headers=_auth(token),
        json={"seat_type": "semi_cama", "min_sold": 0, "max_sold": 50, "price": 23300},
    )

    assert resp.status_code == 201


# ---------------------------------------------------------------------------
# DELETE /admin/trips/{trip_id}/price-tranches/{tranche_id}
# ---------------------------------------------------------------------------

async def test_delete_price_tranche_no_auth_returns_401(client: AsyncClient):
    resp = await client.delete(
        f"/admin/trips/{uuid.uuid4()}/price-tranches/{uuid.uuid4()}"
    )

    assert resp.status_code == 401


async def test_delete_price_tranche_trip_not_found_returns_404(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.delete(
        f"/admin/trips/{uuid.uuid4()}/price-tranches/{uuid.uuid4()}",
        headers=_auth(token),
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


async def test_delete_price_tranche_nonexistent_tranche_returns_404(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip = await _make_trip(db)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.delete(
        f"/admin/trips/{trip.id}/price-tranches/{uuid.uuid4()}",
        headers=_auth(token),
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


async def test_delete_price_tranche_happy_path_returns_204(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip = await _make_trip(db)
    tranche = await _make_tranche(db, trip)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.delete(
        f"/admin/trips/{trip.id}/price-tranches/{tranche.id}",
        headers=_auth(token),
    )

    assert resp.status_code == 204
    assert resp.content == b""


async def test_delete_price_tranche_wrong_trip_returns_404(
    client: AsyncClient, db: AsyncSession
):
    await _make_admin(db)
    trip_a = await _make_trip(db)
    # Second trip on a different route
    route_b = Route(origin="Rosario", destination="Córdoba")
    db.add(route_b)
    await db.flush()
    now = datetime.now(timezone.utc)
    trip_b = Trip(
        route_id=route_b.id,
        departure_at=now + timedelta(days=1),
        arrival_at=now + timedelta(days=1, hours=4),
        status=TripStatusEnum.scheduled,
    )
    db.add(trip_b)
    await db.flush()

    # Tranche belongs to trip_b, but we reference trip_a in the URL
    tranche_b = await _make_tranche(db, trip_b)
    token = await _login(client, "admin@test.com", "secret")

    resp = await client.delete(
        f"/admin/trips/{trip_a.id}/price-tranches/{tranche_b.id}",
        headers=_auth(token),
    )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "not_found"


# ---------------------------------------------------------------------------
# Rate limiting — POST /admin/login
# ---------------------------------------------------------------------------

async def test_login_rate_limit_blocks_after_10_attempts(client: AsyncClient):
    for _ in range(10):
        await client.post(
            "/admin/login",
            json={"email": "nobody@test.com", "password": "wrong"},
        )

    resp = await client.post(
        "/admin/login",
        json={"email": "nobody@test.com", "password": "wrong"},
    )

    assert resp.status_code == 429
