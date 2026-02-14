from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from ..database import Base


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    delivery_type = Column(String, default="single")
    status = Column(String, default="PLANNED")
    total_distance_km = Column(Float)
    total_duration_minutes = Column(Float)
    optimized_distance_km = Column(Float)
    naive_distance_km = Column(Float)
    route_geometry = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


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


class DeliveryEtaLog(Base):
    __tablename__ = "delivery_eta_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    delivery_id = Column(Integer, ForeignKey("deliveries.id"))
    estimated_arrival = Column(DateTime)
    computed_at = Column(DateTime, server_default=func.now())
