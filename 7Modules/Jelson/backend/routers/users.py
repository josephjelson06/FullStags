from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import RoleChecker, get_current_user
from backend.models.user import BuyerProfile, SupplierProfile, User
from backend.schemas.auth import ActivateUserRequest, UpdateProfileRequest, UserListItem, UserProfile
from backend.services.user_profiles import get_full_profile

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=list[UserListItem], dependencies=[Depends(RoleChecker(["admin"]))])
async def list_users(
    role: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    result = await db.execute(stmt)
    users = result.scalars().all()
    return users


@router.get("/{user_id}/profile", response_model=UserProfile)
async def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return await get_full_profile(user, db)


@router.put("/profile", response_model=UserProfile)
async def update_own_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == "buyer":
        invalid_fields = [
            payload.business_name,
            payload.warehouse_address,
            payload.gst_number,
            payload.service_radius_km,
        ]
        if any(field is not None for field in invalid_fields):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fields for buyer")

        result = await db.execute(select(BuyerProfile).where(BuyerProfile.user_id == current_user.id))
        profile = result.scalar_one_or_none()
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer profile not found")

        if payload.factory_name is not None:
            profile.factory_name = payload.factory_name
        if payload.industry_type is not None:
            profile.industry_type = payload.industry_type
        if payload.delivery_address is not None:
            profile.delivery_address = payload.delivery_address
        if payload.latitude is not None:
            profile.latitude = payload.latitude
        if payload.longitude is not None:
            profile.longitude = payload.longitude

    elif current_user.role == "supplier":
        invalid_fields = [payload.factory_name, payload.industry_type, payload.delivery_address]
        if any(field is not None for field in invalid_fields):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fields for supplier")

        result = await db.execute(select(SupplierProfile).where(SupplierProfile.user_id == current_user.id))
        profile = result.scalar_one_or_none()
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier profile not found")

        if payload.business_name is not None:
            profile.business_name = payload.business_name
        if payload.warehouse_address is not None:
            profile.warehouse_address = payload.warehouse_address
        if payload.gst_number is not None:
            profile.gst_number = payload.gst_number
        if payload.service_radius_km is not None:
            profile.service_radius_km = payload.service_radius_km
        if payload.latitude is not None:
            profile.latitude = payload.latitude
        if payload.longitude is not None:
            profile.longitude = payload.longitude

    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admins cannot update profiles")

    await db.commit()
    return await get_full_profile(current_user, db)


@router.patch("/{user_id}/activate", response_model=UserListItem, dependencies=[Depends(RoleChecker(["admin"]))])
async def toggle_user_activation(
    user_id: int,
    payload: ActivateUserRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_active = payload.is_active
    await db.commit()
    await db.refresh(user)
    return user
