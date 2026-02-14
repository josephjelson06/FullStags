export type UserRole = 'buyer' | 'supplier' | 'admin';
export type Urgency = 'critical' | 'high' | 'standard';
export type OrderStatus =
  | 'matching'
  | 'pending_acceptance'
  | 'picking'
  | 'courier_to_supplier'
  | 'courier_to_factory'
  | 'delivered';
export type OrderAction =
  | 'select_supplier'
  | 'accept'
  | 'decline'
  | 'ready'
  | 'courier_picked_up'
  | 'delivered';
export type LegStatus = 'pending' | 'in_progress' | 'completed';


export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyName: string;
  location: GeoLocation;
  token: string;
}

export type AuthResponse = User;

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  companyName: string;
  location: GeoLocation;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateOrderInput {
  partName: string;
  partNumber: string;
  urgency: Urgency;
  deliveryLocation: GeoLocation;
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

export interface Order {
  orderId: string;
  status: OrderStatus;
  partName: string;
  partNumber: string;
  urgency?: Urgency;
  buyer?: { id: string; name: string; companyName: string };
  supplier?: { id: string; name: string; location: GeoLocation };
  selectedSupplier?: SelectedSupplier;
  supplierName?: string;
  deliveryLocation?: GeoLocation;
  partPrice?: number;
  pickTimeMinutes?: number;
  driveTimeMinutes?: number;
  totalTimeMinutes?: number;
  etaMinutesRemaining?: number;
  buyerCompany?: string;
  distanceKm?: number;
  acceptDeadlineMinutes?: number;
  message?: string;
  createdAt: string;
  updatedAt?: string;
  deliveredAt?: string;
  totalFulfillmentMinutes?: number;
  estimatedDowntimeSaved?: number;
}

export interface OrdersResponse {
  orders: Order[];
  page?: number;
  pageSize?: number;
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
  deliveredAt?: string;
  totalFulfillmentMinutes?: number;
  estimatedDowntimeSaved?: number;
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
}

export type RouteResponse = RouteData;

export interface InventoryItem {
  itemId: string;
  partName: string;
  partNumber: string;
  quantity: number;
  price: number;
}

export interface InventoryResponse {
  supplierId: string;
  pickTimeMinutes: number;
  items: InventoryItem[];
}

export interface CreateInventoryItemInput {
  partName: string;
  partNumber: string;
  quantity: number;
  price: number;
}

export interface UpdateInventoryItemInput {
  partName?: string;
  partNumber?: string;
  quantity?: number;
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
  code?: string;
  traceId?: string;
  details?: unknown;
}
