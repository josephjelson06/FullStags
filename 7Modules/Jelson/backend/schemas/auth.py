from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterBuyerRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    factory_name: str
    industry_type: Optional[str] = None
    delivery_address: Optional[str] = None
    latitude: float
    longitude: float


class RegisterSupplierRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    business_name: str
    warehouse_address: Optional[str] = None
    gst_number: Optional[str] = None
    service_radius_km: Optional[float] = None
    latitude: float
    longitude: float


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int


class UserProfile(BaseModel):
    user_id: int
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime
    profile_id: Optional[int] = None

    factory_name: Optional[str] = None
    industry_type: Optional[str] = None
    delivery_address: Optional[str] = None
    business_name: Optional[str] = None
    warehouse_address: Optional[str] = None
    gst_number: Optional[str] = None
    service_radius_km: Optional[float] = None
    reliability_score: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class UserListItem(BaseModel):
    id: int
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UpdateProfileRequest(BaseModel):
    factory_name: Optional[str] = None
    industry_type: Optional[str] = None
    delivery_address: Optional[str] = None
    business_name: Optional[str] = None
    warehouse_address: Optional[str] = None
    gst_number: Optional[str] = None
    service_radius_km: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ActivateUserRequest(BaseModel):
    is_active: bool
