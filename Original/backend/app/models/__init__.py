"""Models package — re-exports all schemas for backward compatibility."""

from app.models.shared import Location  # noqa: F401
from app.models.auth import RegisterRequest, LoginRequest, AuthResponse  # noqa: F401
from app.models.orders import (  # noqa: F401
    CreateOrderRequest,
    OrderActionRequest,
    MatchResponse,
    OrderMatchesResponse,
    SelectedSupplierInfo,
    OrderActionResponse,
    OrderBuyer,
    OrderSupplier,
    OrderDetailResponse,
    OrderListItem,
    OrderListResponse,
)
from app.models.routes import LegInfo, RouteCoord, RouteResponse  # noqa: F401
from app.models.inventory import (  # noqa: F401
    CreateInventoryRequest,
    PatchInventoryRequest,
    InventoryItemResponse,
    InventoryListResponse,
)
from app.models.supplier import UpdatePickTimeRequest, PickTimeResponse  # noqa: F401
from app.models.admin import DashboardResponse  # noqa: F401
