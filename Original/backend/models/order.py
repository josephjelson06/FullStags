# Re-export alias — order_service references models.order, actual classes live in orders.py
from backend.models.orders import Order, OrderAssignment, OrderItem, OrderStatusHistory

__all__ = ["Order", "OrderItem", "OrderAssignment", "OrderStatusHistory"]
