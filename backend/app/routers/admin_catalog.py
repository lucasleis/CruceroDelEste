from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_current_admin, get_db, trip_load_options
from app.errors import NotFoundError
from app.models.booking import AdminUser, Booking, BookingStatusEnum
from app.models.trip import (
    Route,
    Seat,
    SeatLayout,
    SeatStatusEnum,
    SeatTypeEnum,
    Stop,
    Trip,
    TripStatusEnum,
)
from app.schemas.admin import (
    AdminTripRead,
    RouteCreate,
    SeatLayoutRead,
    StopCreate,
    StopUpdate,
    TripCreate,
    TripUpdate,
)
from app.schemas.trips import RouteRead, StopRead

router = APIRouter(prefix="/admin", tags=["admin-catalog"])


# ---------------------------------------------------------------------------
# GET /admin/seat-layouts
# ---------------------------------------------------------------------------


@router.get("/seat-layouts", response_model=list[SeatLayoutRead])
async def list_seat_layouts(
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[SeatLayoutRead]:
    result = await db.execute(select(SeatLayout).order_by(SeatLayout.name.asc()))
    return list(result.scalars().all())


# ---------------------------------------------------------------------------
# Stops CRUD
# ---------------------------------------------------------------------------


@router.post("/stops", response_model=StopRead, status_code=status.HTTP_201_CREATED)
async def create_stop(
    body: StopCreate,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> StopRead:
    existing = await db.execute(select(Stop).where(Stop.name == body.name))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="stop_name_conflict",
        )
    stop = Stop(name=body.name, country=body.country, province=body.province)
    db.add(stop)
    await db.commit()
    await db.refresh(stop)
    return stop


@router.patch("/stops/{stop_id}", response_model=StopRead)
async def update_stop(
    stop_id: UUID,
    body: StopUpdate,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> StopRead:
    stop = await db.get(Stop, stop_id)
    if stop is None:
        raise NotFoundError()

    if body.name is not None and body.name != stop.name:
        dup = await db.execute(select(Stop).where(Stop.name == body.name))
        if dup.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="stop_name_conflict",
            )
        stop.name = body.name

    if body.country is not None and body.country != stop.country:
        routes_check = await db.execute(
            select(Route.id)
            .where(
                (Route.origin_stop_id == stop_id) | (Route.destination_stop_id == stop_id)
            )
            .limit(1)
        )
        if routes_check.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="stop_in_use",
            )
        stop.country = body.country

    if body.province is not None:
        stop.province = body.province

    await db.commit()
    await db.refresh(stop)
    return stop


@router.delete("/stops/{stop_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stop(
    stop_id: UUID,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    stop = await db.get(Stop, stop_id)
    if stop is None:
        raise NotFoundError()

    routes_check = await db.execute(
        select(Route.id)
        .where(
            (Route.origin_stop_id == stop_id) | (Route.destination_stop_id == stop_id)
        )
        .limit(1)
    )
    if routes_check.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="stop_in_use",
        )

    await db.delete(stop)
    await db.commit()


# ---------------------------------------------------------------------------
# Routes CRUD
# ---------------------------------------------------------------------------


@router.get("/routes", response_model=list[RouteRead])
async def list_routes(
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[RouteRead]:
    result = await db.execute(
        select(Route).options(
            selectinload(Route.origin_stop),
            selectinload(Route.destination_stop),
        )
    )
    return list(result.scalars().all())


@router.post("/routes", response_model=RouteRead, status_code=status.HTTP_201_CREATED)
async def create_route(
    body: RouteCreate,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> RouteRead:
    origin = await db.get(Stop, body.origin_stop_id)
    if origin is None:
        raise NotFoundError()
    destination = await db.get(Stop, body.destination_stop_id)
    if destination is None:
        raise NotFoundError()

    if origin.country == destination.country:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="international_route_required",
        )

    dup = await db.execute(
        select(Route).where(
            Route.origin_stop_id == body.origin_stop_id,
            Route.destination_stop_id == body.destination_stop_id,
        )
    )
    if dup.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="route_already_exists",
        )

    route = Route(
        origin_stop_id=body.origin_stop_id,
        destination_stop_id=body.destination_stop_id,
    )
    db.add(route)
    await db.flush()
    route_id = route.id
    await db.commit()

    result = await db.execute(
        select(Route)
        .options(
            selectinload(Route.origin_stop),
            selectinload(Route.destination_stop),
        )
        .where(Route.id == route_id)
    )
    return result.scalar_one()


@router.delete("/routes/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(
    route_id: UUID,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    route = await db.get(Route, route_id)
    if route is None:
        raise NotFoundError()

    trips_check = await db.execute(
        select(Trip.id).where(Trip.route_id == route_id).limit(1)
    )
    if trips_check.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="route_in_use",
        )

    await db.delete(route)
    await db.commit()


# ---------------------------------------------------------------------------
# Trips CRUD
# ---------------------------------------------------------------------------


@router.get("/trips", response_model=list[AdminTripRead])
async def list_admin_trips(
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminTripRead]:
    result = await db.execute(
        select(Trip)
        .options(trip_load_options())
        .order_by(Trip.departure_at.asc())
    )
    return list(result.scalars().all())


@router.get("/trips/{trip_id}", response_model=AdminTripRead)
async def get_admin_trip(
    trip_id: UUID,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminTripRead:
    result = await db.execute(
        select(Trip).options(trip_load_options()).where(Trip.id == trip_id)
    )
    trip = result.scalar_one_or_none()
    if trip is None:
        raise NotFoundError()
    return trip


@router.post("/trips", response_model=AdminTripRead, status_code=status.HTTP_201_CREATED)
async def create_trip(
    body: TripCreate,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminTripRead:
    now = datetime.now(timezone.utc)
    if body.departure_at <= now:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="departure_in_past",
        )
    if body.arrival_at <= body.departure_at:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="arrival_before_departure",
        )

    route = await db.get(Route, body.route_id)
    if route is None:
        raise NotFoundError()

    layout = await db.get(SeatLayout, body.seat_layout_id)
    if layout is None:
        raise NotFoundError()

    trip = Trip(
        route_id=body.route_id,
        seat_layout_id=body.seat_layout_id,
        departure_at=body.departure_at,
        arrival_at=body.arrival_at,
        status=TripStatusEnum.scheduled,
    )
    db.add(trip)
    await db.flush()
    trip_id = trip.id

    for i in range(1, layout.total_cama + 1):
        db.add(Seat(
            trip_id=trip_id,
            seat_number=f"C{i:02d}",
            seat_type=SeatTypeEnum.cama,
            status=SeatStatusEnum.available,
        ))
    for i in range(1, layout.total_semi_cama + 1):
        db.add(Seat(
            trip_id=trip_id,
            seat_number=f"S{i:02d}",
            seat_type=SeatTypeEnum.semi_cama,
            status=SeatStatusEnum.available,
        ))

    await db.commit()

    result = await db.execute(
        select(Trip).options(trip_load_options()).where(Trip.id == trip_id)
    )
    return result.scalar_one()


@router.patch("/trips/{trip_id}", response_model=AdminTripRead)
async def update_trip(
    trip_id: UUID,
    body: TripUpdate,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminTripRead:
    result = await db.execute(
        select(Trip).options(trip_load_options()).where(Trip.id == trip_id)
    )
    trip = result.scalar_one_or_none()
    if trip is None:
        raise NotFoundError()

    effective_departure = body.departure_at if body.departure_at is not None else trip.departure_at
    effective_arrival = body.arrival_at if body.arrival_at is not None else trip.arrival_at
    if effective_arrival <= effective_departure:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="arrival_before_departure",
        )

    if body.status == TripStatusEnum.cancelled and trip.status != TripStatusEnum.cancelled:
        confirmed = await db.execute(
            select(Booking.id)
            .where(
                Booking.trip_id == trip_id,
                Booking.status == BookingStatusEnum.confirmed,
            )
            .limit(1)
        )
        if confirmed.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="trip_has_confirmed_bookings",
            )

    if body.departure_at is not None:
        trip.departure_at = body.departure_at
    if body.arrival_at is not None:
        trip.arrival_at = body.arrival_at
    if body.status is not None:
        trip.status = body.status

    await db.commit()

    result = await db.execute(
        select(Trip).options(trip_load_options()).where(Trip.id == trip_id)
    )
    return result.scalar_one()


@router.delete("/trips/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(
    trip_id: UUID,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    trip = await db.get(Trip, trip_id)
    if trip is None:
        raise NotFoundError()

    bookings_check = await db.execute(
        select(Booking.id).where(Booking.trip_id == trip_id).limit(1)
    )
    if bookings_check.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="trip_has_bookings",
        )

    await db.delete(trip)
    await db.commit()
