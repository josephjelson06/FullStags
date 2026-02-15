export type UserRole = 'buyer' | 'supplier' | 'admin';
export type Urgency = 'critical' | 'high' | 'urgent' | 'standard';

export type BackendOrderStatus =
  | 'PLACED'
  | 'MATCHED'
  | 'CONFIRMED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

// Keep legacy statuses for backward compatibility with older pages/components.
export type LegacyOrderStatus =
  | 'matching'
  | 'pending_acceptance'
  | 'picking'
  | 'courier_to_supplier'
  | 'courier_to_factory'
  | 'delivered';

export type OrderStatus = BackendOrderStatus | LegacyOrderStatus;

export type OrderAction =
  | 'select_supplier'
  | 'accept'
  | 'decline'
  | 'ready'
  | 'courier_picked_up'
  | 'delivered'
  | 'cancel';

export type LegStatus = 'pending' | 'in_progress' | 'completed';

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface SessionUser {
  userId: number;
  email: string;
  role: UserRole;
  displayName: string;
  companyName: string;
  token: string;
  location: GeoLocation;
}

// Legacy alias used across existing pages/hooks.
export interface User extends SessionUser {
  id: string;
  name: string;
}

export type AuthResponse = User;

export interface RegisterInput {
  email: string;
  password: string;
  role: Extract<UserRole, 'buyer' | 'supplier'>;
  displayName: string;
  companyName: string;
  industryType?: string;
  gstNumber?: string;
  serviceRadiusKm?: number;
  location: GeoLocation;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateOrderItemInput {
  categoryId: number;
  partNumber: string;
  partDescription?: string;
  quantity: number;
}

export interface CreateOrderInput {
  items: CreateOrderItemInput[];
  urgency: Extract<Urgency, 'critical' | 'urgent' | 'standard'>;
}

export interface SupplierMatch {
  matchId: string;
  supplierId: string;
  supplierName: string;
  distanceKm: number;
  pickTimeMinutes: number;
  driveTimeMinutes: number;
  totalTimeMinutes: number;
  partPrice: number;
  supplierLocation: GeoLocation;
}

export interface MatchResponse {
  orderId: string;
  matches: SupplierMatch[];
}

export interface SelectedSupplier {
  supplierId: string;
  supplierName: string;
  totalTimeMinutes: number;
}

export interface OrderItemAssignment {
  id: number;
  orderItemId: number;
  supplierId: number;
  supplierName?: string | null;
  supplierUserId?: number | null;
  catalogId: number;
  assignedPrice?: number | null;
  matchScore?: number | null;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'FULFILLED' | string;
  distanceKm?: number | null;
}

export interface OrderItemSummary {
  id: number;
  orderId: number;
  categoryId: number;
  categoryName?: string | null;
  partNumber: string;
  partDescription?: string | null;
  quantity: number;
  status: string;
  assignments: OrderItemAssignment[];
}

export interface Order {
  id: number;
  orderId: string;
  status: OrderStatus;
  urgency?: Urgency | string;
  partName: string;
  partNumber: string;
  buyerCompany?: string;
  supplierName?: string;
  distanceKm?: number;
  partPrice?: number;
  etaMinutesRemaining?: number;
  message?: string;
  createdAt: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  totalItems?: number;
  totalValue?: number;
  buyerUserId?: number;
  buyer?: {
    id: string;
    name: string;
    companyName: string;
  };
  supplier?: {
    id: string;
    name: string;
    location: GeoLocation;
  };
  items: OrderItemSummary[];
  selectedSupplier?: SelectedSupplier;
}

export interface OrdersResponse {
  orders?: Order[];
  items?: Order[];
  page?: number;
  pageSize?: number;
  page_size?: number;
  total?: number;
}

export interface UpdateOrderInput {
  action: OrderAction;
  matchId?: string;
}

export interface UpdateOrderResponse {
  orderId: string;
  status: OrderStatus;
  selectedSupplier?: SelectedSupplier;
  message?: string;
  updatedAt?: string;
}

export interface RouteLeg {
  label: string;
  status: LegStatus;
}

export interface RouteData {
  orderId: string;
  status: OrderStatus;
  supplierLocation: { lat: number; lng: number };
  factoryLocation: { lat: number; lng: number };
  courierCurrentLocation: { lat: number; lng: number };
  etaMinutesRemaining: number;
  legs: RouteLeg[];
  deliveryId?: number;
}

export type RouteResponse = RouteData;

export interface InventoryItem {
  itemId: string;
  id?: number;
  categoryId?: number;
  categoryName?: string | null;
  partName: string;
  partNumber: string;
  brand?: string | null;
  quantity: number;
  minOrderQuantity?: number;
  leadTimeHours?: number;
  price: number;
}

export interface InventoryResponse {
  supplierId: string;
  pickTimeMinutes: number;
  items: InventoryItem[];
}

export interface CreateInventoryItemInput {
  categoryId: number;
  partName: string;
  partNumber: string;
  brand?: string;
  quantity: number;
  minOrderQuantity?: number;
  leadTimeHours: number;
  price: number;
}

export interface UpdateInventoryItemInput {
  categoryId?: number;
  partName?: string;
  partNumber?: string;
  brand?: string;
  quantity?: number;
  minOrderQuantity?: number;
  leadTimeHours?: number;
  price?: number;
}

export interface UpdatePickTimeResponse {
  supplierId: string;
  pickTimeMinutes: number;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalOrdersToday: number;
  averageMatchTimeSeconds: number;
  averageDeliveryTimeMinutes: number;
  fulfillmentRate: number;
  totalDowntimeSavedDollars: number;
  activeOrdersCount: number;
  pendingOrdersCount: number;
}

export interface ApiError {
  error: string;
  message?: string;
  detail?: string;
  code?: string;
  traceId?: string;
  details?: unknown;
}
