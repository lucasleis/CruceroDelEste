import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import ChargebackAlreadyInStatusError
from app.models.booking import Chargeback, ChargebackStatusEnum

logger = logging.getLogger(__name__)


async def upsert_chargeback(
    db: AsyncSession,
    booking_id: UUID,
    mp_payment_id: str,
    status_detail: str | None,
) -> Chargeback:
    try:
        new_status = ChargebackStatusEnum(status_detail)
    except ValueError:
        logger.warning(
            "chargeback_unknown_status_detail status_detail=%r mp_payment_id=%s",
            status_detail, mp_payment_id,
        )
        new_status = ChargebackStatusEnum.in_process

    cb_result = await db.execute(
        select(Chargeback)
        .where(Chargeback.mp_payment_id == mp_payment_id)
        .order_by(Chargeback.created_at.desc())
        .limit(1)
    )
    existing = cb_result.scalar_one_or_none()

    if existing is not None:
        if existing.status == new_status:
            raise ChargebackAlreadyInStatusError()
        existing.status = new_status
        existing.status_detail = status_detail or None
        existing.updated_at = datetime.now(timezone.utc)
        return existing

    chargeback = Chargeback(
        booking_id=booking_id,
        mp_payment_id=mp_payment_id,
        status=new_status,
        status_detail=status_detail or None,
    )
    db.add(chargeback)
    return chargeback
