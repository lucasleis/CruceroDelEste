from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import get_current_admin, get_db, trip_load_options
from app.errors import NotFoundError
from app.models.booking import AdminUser, Booking, BookingStatusEnum
from app.models.trip import (
    Route,
    RouteStop,
    Seat,
    SeatLayout,
    SeatLayoutSeat,
    SeatStatusEnum,
    SeatTypeEnum,
    Stop,
    Trip,
    TripStatusEnum,
)
from app.schemas.admin import (
    AdminSeatRead,
    AdminSeatStatusUpdate,
    AdminTripRead,
    PriceTrancheSummary,
    RouteCreate,
    RouteStopAdd,
    RouteStopRead,
    RouteStopReorder,
    SeatLayoutRead,
    StopCreate,
    StopUpdate,
    TrancheCoverage,
    TripCreate,
    TripUpdate,
)
from app.schemas.trips import RouteRead, StopRead

router = APIRouter(prefix="/admin", tags=["admin-catalog"])


def compute_coverage(
    tranches: list, seat_type: SeatTypeEnum, total: int
) -> TrancheCoverage:
    if total == 0:
        return TrancheCoverage(is_complete=False, first_gap=None, total=0)

    relevant = sorted(
        [t for t in tranches if t.seat_type == seat_type],
        key=lambda t: t.min_sold,
    )
    expected = 1
    for t in relevant:
        if t.min_sold > expected:
            return TrancheCoverage(is_complete=False, first_gap=expected, total=total)
        expected = max(expected, t.max_sold + 1)

    is_complete = expected > total
    return TrancheCoverage(
        is_complete=is_complete,
        first_gap=None if is_complete else expected,
        total=total,
    )


def build_tranche_summary(trip: Trip, layout: SeatLayout | None) -> PriceTrancheSummary:
    total_cama = layout.total_cama if layout else 0
    total_semi_cama = layout.total_semi_cama if layout else 0
    return PriceTrancheSummary(
        cama=compute_coverage(trip.price_tranches, SeatTypeEnum.cama, total_cama),
        semi_cama=compute_coverage(
            trip.price_tranches, SeatTypeEnum.semi_cama, total_semi_cama
        ),
    )


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


@router.get("/routes/{route_id}/stops", response_model=list[RouteStopRead])
async def get_route_stops(
    route_id: UUID,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[RouteStopRead]:
    route = await db.get(Route, route_id)
    if route is None:
        raise NotFoundError()

    result = await db.execute(
        select(RouteStop.order, Stop.id, Stop.name, Stop.country)
        .join(Stop, RouteStop.stop_id == Stop.id)
        .where(RouteStop.route_id == route_id)
        .order_by(RouteStop.order.asc())
    )
    return [
        RouteStopRead(order=order, stop_id=stop_id, name=name, country=country)
        for order, stop_id, name, country in result.all()
    ]


@router.post(
    "/routes/{route_id}/stops",
    response_model=list[RouteStopRead],
    status_code=status.HTTP_201_CREATED,
)
async def add_route_stop(
    route_id: UUID,
    body: RouteStopAdd,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[RouteStopRead]:
    route = await db.get(Route, route_id)
    if route is None:
        raise NotFoundError()

    stop = await db.get(Stop, body.stop_id)
    if stop is None:
        raise NotFoundError()

    existing_stop = await db.execute(
        select(RouteStop).where(
            RouteStop.route_id == route_id,
            RouteStop.stop_id == body.stop_id,
        )
    )
    if existing_stop.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="stop_already_in_route",
        )

    existing_order = await db.execute(
        select(RouteStop).where(
            RouteStop.route_id == route_id,
            RouteStop.order == body.order,
        )
    )
    if existing_order.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="order_already_taken",
        )

    db.add(RouteStop(route_id=route_id, stop_id=body.stop_id, order=body.order))
    await db.commit()

    result = await db.execute(
        select(RouteStop.order, Stop.id, Stop.name, Stop.country)
        .join(Stop, RouteStop.stop_id == Stop.id)
        .where(RouteStop.route_id == route_id)
        .order_by(RouteStop.order.asc())
    )
    return [
        RouteStopRead(order=order, stop_id=stop_id, name=name, country=country)
        for order, stop_id, name, country in result.all()
    ]


@router.delete(
    "/routes/{route_id}/stops/{stop_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_route_stop(
    route_id: UUID,
    stop_id: UUID,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    route = await db.get(Route, route_id)
    if route is None:
        raise NotFoundError()

    result = await db.execute(
        select(RouteStop).where(
            RouteStop.route_id == route_id,
            RouteStop.stop_id == stop_id,
        )
    )
    route_stop = result.scalar_one_or_none()
    if route_stop is None:
        raise NotFoundError()

    await db.delete(route_stop)
    await db.commit()


@router.put(
    "/routes/{route_id}/stops/reorder",
    response_model=list[RouteStopRead],
)
async def reorder_route_stops(
    route_id: UUID,
    body: RouteStopReorder,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[RouteStopRead]:
    route = await db.get(Route, route_id)
    if route is None:
        raise NotFoundError()

    result = await db.execute(
        select(RouteStop).where(RouteStop.route_id == route_id)
    )
    route_stops = list(result.scalars().all())

    current_ids = {rs.stop_id for rs in route_stops}
    new_ids = set(body.stop_ids)
    if current_ids != new_ids or len(body.stop_ids) != len(route_stops):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="stop_ids_mismatch",
        )

    by_stop_id = {rs.stop_id: rs for rs in route_stops}
    for position, stop_id in enumerate(body.stop_ids):
        by_stop_id[stop_id].order = position

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="reorder_conflict",
        )

    result = await db.execute(
        select(RouteStop.order, Stop.id, Stop.name, Stop.country)
        .join(Stop, RouteStop.stop_id == Stop.id)
        .where(RouteStop.route_id == route_id)
        .order_by(RouteStop.order.asc())
    )
    return [
        RouteStopRead(order=order, stop_id=stop_id, name=name, country=country)
        for order, stop_id, name, country in result.all()
    ]


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
        .options(
            trip_load_options(),
            selectinload(Trip.price_tranches),
            selectinload(Trip.seat_layout),
        )
        .order_by(Trip.departure_at.asc())
    )
    trips = result.scalars().all()
    return [
        AdminTripRead.model_validate({
            **trip.__dict__,
            "route": trip.route,
            "price_tranches_summary": build_tranche_summary(trip, trip.seat_layout),
        })
        for trip in trips
    ]


@router.get("/trips/{trip_id}", response_model=AdminTripRead)
async def get_admin_trip(
    trip_id: UUID,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminTripRead:
    result = await db.execute(
        select(Trip)
        .options(
            trip_load_options(),
            selectinload(Trip.price_tranches),
            selectinload(Trip.seat_layout),
        )
        .where(Trip.id == trip_id)
    )
    trip = result.scalar_one_or_none()
    if trip is None:
        raise NotFoundError()
    return AdminTripRead.model_validate({
        **trip.__dict__,
        "route": trip.route,
        "price_tranches_summary": build_tranche_summary(trip, trip.seat_layout),
    })


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

    # Load seat definitions from seat_layout_seats
    layout_seats_result = await db.execute(
        select(SeatLayoutSeat)
        .where(SeatLayoutSeat.seat_layout_id == body.seat_layout_id)
        .order_by(SeatLayoutSeat.display_order.asc())
    )
    layout_seats = layout_seats_result.scalars().all()

    if not layout_seats:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="seat_layout_has_no_seats",
        )

    for ls in layout_seats:
        db.add(Seat(
            trip_id=trip_id,
            seat_number=ls.seat_number,
            seat_type=ls.seat_type,
            status=SeatStatusEnum.available,
        ))

    await db.commit()

    result = await db.execute(
        select(Trip)
        .options(
            trip_load_options(),
            selectinload(Trip.price_tranches),
            selectinload(Trip.seat_layout),
        )
        .where(Trip.id == trip_id)
    )
    trip = result.scalar_one()
    return AdminTripRead.model_validate({
        **trip.__dict__,
        "route": trip.route,
        "price_tranches_summary": build_tranche_summary(trip, trip.seat_layout),
    })


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
        select(Trip)
        .options(
            trip_load_options(),
            selectinload(Trip.price_tranches),
            selectinload(Trip.seat_layout),
        )
        .where(Trip.id == trip_id)
    )
    trip = result.scalar_one()
    return AdminTripRead.model_validate({
        **trip.__dict__,
        "route": trip.route,
        "price_tranches_summary": build_tranche_summary(trip, trip.seat_layout),
    })


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


# ---------------------------------------------------------------------------
# Trip seats
# ---------------------------------------------------------------------------


@router.get("/trips/{trip_id}/seats", response_model=list[AdminSeatRead])
async def get_trip_seats(
    trip_id: UUID,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[AdminSeatRead]:
    trip = await db.get(Trip, trip_id)
    if trip is None:
        raise NotFoundError()

    result = await db.execute(
        select(Seat)
        .outerjoin(
            SeatLayoutSeat,
            (SeatLayoutSeat.seat_layout_id == trip.seat_layout_id)
            & (SeatLayoutSeat.seat_number == Seat.seat_number),
        )
        .where(Seat.trip_id == trip_id)
        .order_by(SeatLayoutSeat.display_order.asc().nullslast(), Seat.seat_number.asc())
    )
    return list(result.scalars().all())


@router.patch("/trips/{trip_id}/seats/{seat_number}", response_model=AdminSeatRead)
async def update_seat_status(
    trip_id: UUID,
    seat_number: str,
    body: AdminSeatStatusUpdate,
    _admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminSeatRead:
    trip = await db.get(Trip, trip_id)
    if trip is None:
        raise NotFoundError()

    result = await db.execute(
        select(Seat).where(Seat.trip_id == trip_id, Seat.seat_number == seat_number)
    )
    seat = result.scalar_one_or_none()
    if seat is None:
        raise NotFoundError()

    if body.status == "blocked":
        if seat.status != SeatStatusEnum.available:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="seat_not_available",
            )
        seat.status = SeatStatusEnum.blocked
    else:
        if seat.status != SeatStatusEnum.blocked:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="seat_not_blocked",
            )
        seat.status = SeatStatusEnum.available

    await db.commit()
    await db.refresh(seat)
    return seat
