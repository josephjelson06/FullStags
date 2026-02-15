from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, CheckConstraint
from sqlalchemy.sql import func

from backend.database import Base


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    delivery_type = Column(String, server_default="single")
    status = Column(String, server_default="PLANNED")
    total_distance_km = Column(Float)
    total_duration_minutes = Column(Float)
    optimized_distance_km = Column(Float)
    naive_distance_km = Column(Float)
    route_geometry = Column(String)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    __table_args__ = (
        CheckConstraint("delivery_type IN ('single','batched')", name="ck_deliveries_type"),
        CheckConstraint("status IN ('PLANNED','IN_PROGRESS','COMPLETED')", name="ck_deliveries_status"),
    )


class DeliveryStop(Base):
    __tablename__ = "delivery_stops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"))
    order_assignment_id = Column(Integer, ForeignKey("order_assignments.id"))
    stop_type = Column(String)
    sequence_order = Column(Integer, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    time_window_start = Column(DateTime)
    time_window_end = Column(DateTime)
    eta = Column(DateTime)

    __table_args__ = (
        CheckConstraint("stop_type IN ('pickup','dropoff')", name="ck_delivery_stops_type"),
    )


class DeliveryEtaLog(Base):
    __tablename__ = "delivery_eta_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"))
    estimated_arrival = Column(DateTime)
    computed_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
