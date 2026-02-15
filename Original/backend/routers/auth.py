from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import create_access_token, get_current_user, hash_password, verify_password
from backend.models.user import BuyerProfile, SupplierProfile, User
from backend.schemas.auth import (
    LoginRequest,
    RegisterBuyerRequest,
    RegisterSupplierRequest,
    TokenResponse,
    UserProfile,
)
from backend.services.user_profiles import get_full_profile

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register/buyer", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_buyer(payload: RegisterBuyerRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="buyer",
    )
    db.add(user)
    await db.flush()

    profile = BuyerProfile(
        user_id=user.id,
        factory_name=payload.factory_name,
        industry_type=payload.industry_type,
        delivery_address=payload.delivery_address,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(profile)
    await db.commit()

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, token_type="bearer", role=user.role, user_id=user.id)


@router.post("/register/supplier", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_supplier(payload: RegisterSupplierRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="supplier",
    )
    db.add(user)
    await db.flush()

    profile = SupplierProfile(
        user_id=user.id,
        business_name=payload.business_name,
        warehouse_address=payload.warehouse_address,
        gst_number=payload.gst_number,
        service_radius_km=payload.service_radius_km or 100,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(profile)
    await db.commit()

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, token_type="bearer", role=user.role, user_id=user.id)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, token_type="bearer", role=user.role, user_id=user.id)


@router.get("/me", response_model=UserProfile)
async def me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_full_profile(current_user, db)
