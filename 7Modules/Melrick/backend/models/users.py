from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from ..database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class BuyerProfile(Base):
    __tablename__ = "buyer_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    factory_name = Column(String, nullable=False)
    industry_type = Column(String)
    delivery_address = Column(String)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)


class SupplierProfile(Base):
    __tablename__ = "supplier_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    business_name = Column(String, nullable=False)
    warehouse_address = Column(String)
    gst_number = Column(String)
    service_radius_km = Column(Float, default=100)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    reliability_score = Column(Float, default=0.5)
