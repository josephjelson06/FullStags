from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user import BuyerProfile, SupplierProfile, User
from backend.schemas.auth import UserProfile


async def get_full_profile(user: User, db: AsyncSession) -> UserProfile:
    profile_id: Optional[int] = None
    data = {
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
    }

    if user.role == "buyer":
        result = await db.execute(select(BuyerProfile).where(BuyerProfile.user_id == user.id))
        buyer_profile = result.scalar_one_or_none()
        if buyer_profile:
            profile_id = buyer_profile.id
            data.update(
                {
                    "factory_name": buyer_profile.factory_name,
                    "industry_type": buyer_profile.industry_type,
                    "delivery_address": buyer_profile.delivery_address,
                    "latitude": buyer_profile.latitude,
                    "longitude": buyer_profile.longitude,
                }
            )
    elif user.role == "supplier":
        result = await db.execute(select(SupplierProfile).where(SupplierProfile.user_id == user.id))
        supplier_profile = result.scalar_one_or_none()
        if supplier_profile:
            profile_id = supplier_profile.id
            data.update(
                {
                    "business_name": supplier_profile.business_name,
                    "warehouse_address": supplier_profile.warehouse_address,
                    "gst_number": supplier_profile.gst_number,
                    "service_radius_km": supplier_profile.service_radius_km,
                    "latitude": supplier_profile.latitude,
                    "longitude": supplier_profile.longitude,
                    "reliability_score": supplier_profile.reliability_score,
                }
            )

    data["profile_id"] = profile_id
    return UserProfile(**data)
