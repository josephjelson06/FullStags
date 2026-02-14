from fastapi import APIRouter, Depends, HTTPException

from backend.events.handlers import trigger_batch_optimization
from backend.middleware.auth import RoleChecker

router = APIRouter(prefix="/api/deliveries", tags=["deliveries"])


@router.post(
    "/optimize-batch",
    dependencies=[Depends(RoleChecker(["admin"]))],
)
async def optimize_batch_deliveries() -> dict:
    optimized = await trigger_batch_optimization()
    if not optimized:
        raise HTTPException(
            status_code=503,
            detail="Batch optimization service is not available in this merge yet",
        )
    return {"status": "ok", "message": "Batch optimization triggered"}
