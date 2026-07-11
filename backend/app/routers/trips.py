import logging
from datetime import date, datetime, time, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, trip_load_options
from app.errors import NotFoundError
from app.models.trip import (
    CountryEnum,
    PriceTranche,
    Route,
    Seat,
    SeatStatusEnum,
    SeatTypeEnum,
    Stop,
    Trip,
    TripStatusEnum,
)
from app.schemas.trips import RouteRead, SeatRead, StopRead, TripRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trips", tags=["trips"])
stops_router = APIRouter(prefix="/stops", tags=["stops"])


@router.get("", response_model=list[TripRead])
async def list_trips(
    origin: str | None = Query(default=None),
    destination: str | None = Query(default=None),
    origin_province: str | None = Query(default=None),
    destination_province: str | None = Query(default=None),
    departure_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[TripRead]:
    now = datetime.now(timezone.utc)

    query = (
        select(Trip)
        .options(trip_load_options())
        .where(
            Trip.status == TripStatusEnum.scheduled,
            Trip.departure_at >= now,
        )
    )

    if origin is not None:
        query = query.where(
            Trip.route.has(Route.origin_stop.has(Stop.name == origin))
        )
    elif origin_province is not None:
        query = query.where(
            Trip.route.has(Route.origin_stop.has(Stop.province == origin_province))
        )
    if destination is not None:
        query = query.where(
            Trip.route.has(Route.destination_stop.has(Stop.name == destination))
        )
    elif destination_province is not None:
        query = query.where(
            Trip.route.has(Route.destination_stop.has(Stop.province == destination_province))
        )

    if departure_date is not None:
        day_start = datetime.combine(departure_date, time.min, tzinfo=timezone.utc)
        day_end = datetime.combine(departure_date, time.max, tzinfo=timezone.utc)
        query = query.where(
            Trip.departure_at >= day_start,
            Trip.departure_at <= day_end,
        )

    query = query.order_by(Trip.departure_at.asc())

    result = await db.execute(query)
    trips = list(result.scalars().all())

    if not trips:
        return []

    trip_ids = [t.id for t in trips]

    available_by_trip = await _available_counts(db, trip_ids)
    prices_by_trip = await _current_prices(db, trip_ids)

    return [
        TripRead(
            id=trip.id,
            route=RouteRead.model_validate(trip.route),
            departure_at=trip.departure_at,
            arrival_at=trip.arrival_at,
            status=trip.status,
            available_seats_count=available_by_trip.get(trip.id, 0),
            current_price_cama=prices_by_trip.get(trip.id, {}).get(SeatTypeEnum.cama),
            current_price_semi_cama=prices_by_trip.get(trip.id, {}).get(
                SeatTypeEnum.semi_cama
            ),
        )
        for trip in trips
    ]


@router.get("/{trip_id}", response_model=TripRead)
async def get_trip(
    trip_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> TripRead:
    result = await db.execute(
        select(Trip).options(trip_load_options()).where(Trip.id == trip_id)
    )
    trip = result.scalar_one_or_none()
    if trip is None:
        raise NotFoundError()

    trip_ids = [trip.id]
    counts = await _available_counts(db, trip_ids)
    prices = await _current_prices(db, trip_ids)

    return TripRead(
        id=trip.id,
        route=trip.route,
        departure_at=trip.departure_at,
        arrival_at=trip.arrival_at,
        status=trip.status,
        available_seats_count=counts.get(trip.id, 0),
        current_price_cama=prices.get(trip.id, {}).get(SeatTypeEnum.cama),
        current_price_semi_cama=prices.get(trip.id, {}).get(SeatTypeEnum.semi_cama),
    )


@router.get("/{trip_id}/seats", response_model=list[SeatRead])
async def list_trip_seats(
    trip_id: UUID,
    seat_type: SeatTypeEnum | None = Query(default=None),
    status: SeatStatusEnum | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[SeatRead]:
    """List seats for a trip.

    Este response refleja el estado al momento de la consulta y no garantiza
    disponibilidad al momento de compra. No usar como fuente de verdad para
    confirmar una reserva.
    """
    trip_check = await db.execute(select(Trip.id).where(Trip.id == trip_id))
    if trip_check.scalar_one_or_none() is None:
        raise NotFoundError()

    query = select(Seat).where(Seat.trip_id == trip_id)
    if seat_type is not None:
        query = query.where(Seat.seat_type == seat_type)
    if status is not None:
        query = query.where(Seat.status == status)
    query = query.order_by(Seat.seat_number.asc())

    result = await db.execute(query)
    return [SeatRead.model_validate(s) for s in result.scalars().all()]


# --- stops endpoints ---------------------------------------------------------


@stops_router.get("", response_model=list[StopRead])
async def list_stops(db: AsyncSession = Depends(get_db)) -> list[StopRead]:
    result = await db.execute(select(Stop).order_by(Stop.name.asc()))
    return [StopRead.model_validate(s) for s in result.scalars().all()]


@stops_router.get("/{stop_id}/valid-destinations", response_model=list[StopRead])
async def list_valid_destinations(
    stop_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> list[StopRead]:
    stop = await db.get(Stop, stop_id)
    if stop is None:
        raise NotFoundError()

    opposite_country = CountryEnum.PY if stop.country == CountryEnum.AR else CountryEnum.AR
    result = await db.execute(
        select(Stop)
        .where(Stop.country == opposite_country)
        .order_by(Stop.name.asc())
    )
    return [StopRead.model_validate(s) for s in result.scalars().all()]


# --- helpers -----------------------------------------------------------------


async def _available_counts(
    db: AsyncSession, trip_ids: list[UUID]
) -> dict[UUID, int]:
    result = await db.execute(
        select(Seat.trip_id, func.count(Seat.id))
        .where(
            Seat.trip_id.in_(trip_ids),
            Seat.status == SeatStatusEnum.available,
        )
        .group_by(Seat.trip_id)
    )
    return {row[0]: row[1] for row in result.all()}


async def _current_prices(
    db: AsyncSession, trip_ids: list[UUID]
) -> dict[UUID, dict[SeatTypeEnum, int | None]]:
    # Sold counts per (trip_id, seat_type). Includes (trip_id, seat_type) pairs
    # with zero sold seats because we count over all seats and use CASE WHEN.
    sold_counts = (
        select(
            Seat.trip_id.label("trip_id"),
            Seat.seat_type.label("seat_type"),
            func.coalesce(
                func.sum(case((Seat.status == SeatStatusEnum.sold, 1), else_=0)),
                0,
            ).label("sold_count"),
        )
        .where(Seat.trip_id.in_(trip_ids))
        .group_by(Seat.trip_id, Seat.seat_type)
        .subquery()
    )

    # LEFT OUTER JOIN so that (trip_id, seat_type) pairs with no covering
    # tranche still appear, with price = NULL — we surface those as None and
    # log a WARNING.
    result = await db.execute(
        select(
            sold_counts.c.trip_id,
            sold_counts.c.seat_type,
            PriceTranche.price,
        )
        .select_from(sold_counts)
        .outerjoin(
            PriceTranche,
            and_(
                PriceTranche.trip_id == sold_counts.c.trip_id,
                PriceTranche.seat_type == sold_counts.c.seat_type,
                PriceTranche.min_sold <= sold_counts.c.sold_count,
                PriceTranche.max_sold > sold_counts.c.sold_count,
            ),
        )
    )

    prices: dict[UUID, dict[SeatTypeEnum, int | None]] = {}
    for trip_id, seat_type, price in result.all():
        prices.setdefault(trip_id, {})[seat_type] = price
        if price is None:
            logger.warning(
                "no_price_tranche trip_id=%s seat_type=%s",
                trip_id,
                seat_type.value if hasattr(seat_type, "value") else seat_type,
            )

    return prices
