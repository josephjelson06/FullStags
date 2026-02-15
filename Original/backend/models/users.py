# Re-export alias — services reference models.users, actual classes live in user.py
from backend.models.user import BuyerProfile, SupplierProfile, User

__all__ = ["User", "BuyerProfile", "SupplierProfile"]
