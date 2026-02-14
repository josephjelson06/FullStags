from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import RoleChecker, get_current_user
from backend.models.matching import MatchingLog
from backend.models.user import User
from backend.schemas.matching import MatchRunRequest, MatchRunResponse, MatchingLogResponse
from backend.services.matching_service import match_full_order

router = APIRouter(prefix="/api/matching", tags=["matching"])


@router.post(
    "/run",
    response_model=MatchRunResponse,
    dependencies=[Depends(RoleChecker(["admin", "buyer"]))],
)
async def run_matching(
    payload: MatchRunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = await match_full_order(payload.order_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MatchRunResponse(**result)


@router.get("/logs", response_model=list[MatchingLogResponse])
async def list_matching_logs(
    order_item_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=300),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"admin", "supplier"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    stmt = select(MatchingLog).order_by(MatchingLog.created_at.desc(), MatchingLog.id.desc()).limit(limit)
    if order_item_id is not None:
        stmt = (
            select(MatchingLog)
            .where(MatchingLog.order_item_id == order_item_id)
            .order_by(MatchingLog.created_at.desc(), MatchingLog.id.desc())
            .limit(limit)
        )

    result = await db.execute(stmt)
    return result.scalars().all()
