from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


InventoryReason = Literal["restock", "order_confirmed", "manual_adjustment", "csv_upload"]


class InventoryAdjustRequest(BaseModel):
    catalog_id: int
    change_amount: int = Field(ne=0)
    reason: InventoryReason


class InventoryTransactionResponse(BaseModel):
    id: int
    catalog_id: int | None = None
    change_amount: int
    reason: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
