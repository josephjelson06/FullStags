from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, server_default="1", nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    buyer_profile = relationship("BuyerProfile", back_populates="user", uselist=False)
    supplier_profile = relationship("SupplierProfile", back_populates="user", uselist=False)

    __table_args__ = (
        CheckConstraint("role IN ('buyer','supplier','admin')", name="ck_users_role"),
    )


class BuyerProfile(Base):
    __tablename__ = "buyer_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    factory_name = Column(String, nullable=False)
    industry_type = Column(String)
    delivery_address = Column(String)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    user = relationship("User", back_populates="buyer_profile")


class SupplierProfile(Base):
    __tablename__ = "supplier_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    business_name = Column(String, nullable=False)
    warehouse_address = Column(String)
    gst_number = Column(String)
    service_radius_km = Column(Float, server_default="100")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    reliability_score = Column(Float, server_default="0.5")

    user = relationship("User", back_populates="supplier_profile")
    catalog_items = relationship("PartsCatalog", back_populates="supplier")
