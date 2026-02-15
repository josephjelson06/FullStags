# Re-export alias — services reference models.inventory, actual classes live in catalog.py
from backend.models.catalog import InventoryTransaction, PartCategory, PartsCatalog

__all__ = ["PartCategory", "PartsCatalog", "InventoryTransaction"]
