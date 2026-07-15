from fastapi import Depends, HTTPException, Request, status
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models.booking import AdminUser
from app.models.trip import Route, Trip

__all__ = ["get_db", "get_current_admin", "trip_load_options"]


async def get_current_admin(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )
    token = request.cookies.get("admin_token")
    if token is None:
        raise invalid
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
            audience="crucero-admin-api",
            issuer="crucero-admin",
            options={"require": ["exp", "sub", "iss", "aud"]},
        )
        admin_id: str | None = payload.get("sub")
        if admin_id is None:
            raise invalid
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise invalid

    result = await db.execute(select(AdminUser).where(AdminUser.id == admin_id))
    admin = result.scalar_one_or_none()
    if admin is None:
        raise invalid

    return admin


def trip_load_options():
    return selectinload(Trip.route).options(
        selectinload(Route.origin_stop),
        selectinload(Route.destination_stop),
    )
