"""Concurrency / race-condition tests for seat reservation.

These target the documented #1 business risk — "Doble venta de asientos"
(CLAUDE.md). ``inventory.reserve_seats`` guards against it with
``SELECT ... FOR UPDATE NOWAIT`` plus handling of Postgres error 55P03
(lock_not_available). No other test exercises that guard under real
concurrency: the existing inventory tests only reserve seats sequentially in
a single session.

We open genuinely independent AsyncSessions (each its own connection via the
session-scoped NullPool engine) so the row-level lock is actually contended.

Requires the same Postgres backend as every other integration test
(testcontainers, or TEST_DATABASE_URL).
"""

import asyncio

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.errors import SeatUnavailableError
from app.models.trip import (
    CountryEnum,
    Route,
    Seat,
    SeatStatusEnum,
    SeatTypeEnum,
    Stop,
    Trip,
    TripStatusEnum,
)
from app.services.inventory import reserve_seats

from datetime import datetime, timedelta, timezone

_NOW = datetime.now(timezone.utc)


async def _seed_trip_with_available_seat(session_factory) -> tuple:
    """Insert (and commit) a scheduled trip with one available seat.

    Returns (trip_id, seat_id). Committed so that independent sessions opened
    afterwards can see and lock the row.
    """
    async with session_factory() as db:
        origin = Stop(name="Retiro", country=CountryEnum.AR)
        destination = Stop(name="Asunción", country=CountryEnum.PY)
        db.add_all([origin, destination])
        await db.flush()
        route = Route(origin_stop_id=origin.id, destination_stop_id=destination.id)
        db.add(route)
        await db.flush()
        trip = Trip(
            route_id=route.id,
            departure_at=_NOW + timedelta(days=1),
            arrival_at=_NOW + timedelta(days=1, hours=4),
            status=TripStatusEnum.scheduled,
        )
        db.add(trip)
        await db.flush()
        seat = Seat(
            trip_id=trip.id,
            seat_number="1",
            seat_type=SeatTypeEnum.cama,
            status=SeatStatusEnum.available,
        )
        db.add(seat)
        await db.flush()
        await db.commit()
        return trip.id, seat.id


@pytest.fixture
def session_factory(test_engine):
    return async_sessionmaker(
        bind=test_engine, class_=AsyncSession, expire_on_commit=False
    )


async def test_reserva_falla_si_asiento_esta_bloqueado_por_otra_transaccion(
    session_factory,
):
    # arrange: un asiento disponible, visible para dos sesiones independientes
    trip_id, seat_id = await _seed_trip_with_available_seat(session_factory)

    async with session_factory() as session_a, session_factory() as session_b:
        # act: la sesión A toma el lock FOR UPDATE y NO commitea todavía
        reserved = await reserve_seats(session_a, [seat_id], trip_id)
        assert [s.id for s in reserved] == [seat_id]

        # act + assert: la sesión B intenta el mismo asiento → NOWAIT dispara
        # 55P03, que reserve_seats traduce a SeatUnavailableError (no espera al lock)
        with pytest.raises(SeatUnavailableError):
            await reserve_seats(session_b, [seat_id], trip_id)

        # la sesión A confirma su reserva
        await session_a.commit()

    # assert: el asiento quedó reservado exactamente una vez
    async with session_factory() as db:
        seat = await db.get(Seat, seat_id)
        assert seat.status == SeatStatusEnum.reserved


async def test_dos_reservas_simultaneas_del_mismo_asiento_solo_una_tiene_exito(
    session_factory,
):
    # arrange: un único asiento disponible
    trip_id, seat_id = await _seed_trip_with_available_seat(session_factory)

    async def _attempt() -> str:
        async with session_factory() as db:
            try:
                await reserve_seats(db, [seat_id], trip_id)
                await db.commit()
                return "ok"
            except SeatUnavailableError:
                await db.rollback()
                return "blocked"

    # act: dos corutinas compiten por el mismo asiento a la vez
    results = await asyncio.gather(_attempt(), _attempt())

    # assert: exactamente una gana; la otra es rechazada (nunca doble venta)
    assert sorted(results) == ["blocked", "ok"]

    async with session_factory() as db:
        seat = await db.get(Seat, seat_id)
        assert seat.status == SeatStatusEnum.reserved
