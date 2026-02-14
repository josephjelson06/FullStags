export type Role = "buyer" | "supplier" | "admin";

export interface UserProfile {
  user_id: number;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  profile_id?: number | null;
  factory_name?: string | null;
  industry_type?: string | null;
  delivery_address?: string | null;
  business_name?: string | null;
  warehouse_address?: string | null;
  gst_number?: string | null;
  service_radius_km?: number | null;
  reliability_score?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UserListItem {
  id: number;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  event_type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  limit: number;
  offset: number;
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface EventLogItem {
  id: number;
  event_type: string;
  entity_type?: string | null;
  entity_id?: number | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
}

export interface EventLogListResponse {
  items: EventLogItem[];
  limit: number;
  offset: number;
  total: number;
}

export interface EventTestContextUser {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  buyer_profile_id?: number | null;
  supplier_profile_id?: number | null;
}

export interface EventTemplate {
  event_type: string;
  payload: Record<string, unknown>;
  target_user_ids: number[];
}

export interface EventTestContextResponse {
  users: EventTestContextUser[];
  sample_event_templates: Record<string, EventTemplate>;
}

export interface EventTestEmitResponse {
  event_id: number;
  event_type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  target_user_ids: number[];
  notification_ids: number[];
  notifications_created: number;
}

export interface SocketEventPayload {
  event_type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  timestamp: string;
  notification_id?: number | null;
  user_id?: number | null;
  is_read?: boolean;
  created_at?: string;
  target_user_ids?: number[];
}

export interface OrderAssignment {
  id: number;
  order_item_id?: number | null;
  supplier_id?: number | null;
  catalog_id?: number | null;
  assigned_price?: number | null;
  match_score?: number | null;
  status: string;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id?: number | null;
  category_id?: number | null;
  part_number: string;
  part_description?: string | null;
  quantity: number;
  status: string;
  assignments: OrderAssignment[];
}

export interface Order {
  id: number;
  buyer_id?: number | null;
  status: string;
  urgency: string;
  required_delivery_date?: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface Category {
  id: number;
  name: string;
  subcategory?: string | null;
}

export interface CatalogItem {
  id: number;
  supplier_id?: number | null;
  category_id?: number | null;
  part_name: string;
  part_number: string;
  normalized_part_number: string;
  brand?: string | null;
  unit_price: number;
  quantity_in_stock: number;
  min_order_quantity: number;
  lead_time_hours: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: number;
  catalog_id?: number | null;
  change_amount: number;
  reason?: string | null;
  created_at: string;
}

export interface MatchingLog {
  id: number;
  order_item_id?: number | null;
  supplier_id?: number | null;
  distance_km?: number | null;
  distance_score?: number | null;
  reliability_score?: number | null;
  price_score?: number | null;
  urgency_score?: number | null;
  total_score?: number | null;
  rank?: number | null;
  created_at: string;
}

export interface MatchRunResponse {
  order_id: number;
  matched_items: number;
  assignments_created: number;
  logs_written: number;
}

export interface Delivery {
  id: number;
  delivery_type: string;
  status: string;
  total_distance_km?: number | null;
  total_duration_minutes?: number | null;
  optimized_distance_km?: number | null;
  naive_distance_km?: number | null;
  route_geometry?: string | null;
  created_at: string;
}

export interface AnalyticsKpis {
  total_orders: number;
  fulfillment_rate_percent: number;
  avg_matching_time_seconds?: number | null;
  avg_delivery_eta_minutes?: number | null;
  route_efficiency_percent?: number | null;
}

export interface CategoryDemandPoint {
  category_id: number;
  category_name: string;
  order_count: number;
}

export interface OrdersOverTimePoint {
  date: string;
  order_count: number;
}

export interface RegionDemandPoint {
  region: string;
  order_count: number;
}

export interface DemandAnalyticsResponse {
  top_categories: CategoryDemandPoint[];
  orders_over_time: OrdersOverTimePoint[];
  orders_by_region: RegionDemandPoint[];
}

export interface RouteComparisonPoint {
  delivery_id: number;
  created_at: string;
  naive_distance_km: number;
  optimized_distance_km: number;
  km_saved: number;
  percent_saved: number;
}

export interface RouteDistanceTrendPoint {
  date: string;
  avg_distance_km: number;
  delivery_count: number;
}

export interface RouteAnalyticsResponse {
  total_km_saved: number;
  batched_deliveries: RouteComparisonPoint[];
  avg_distance_over_time: RouteDistanceTrendPoint[];
}

export interface SupplierPerformancePoint {
  supplier_id: number;
  supplier_user_id: number;
  supplier_name: string;
  orders_fulfilled: number;
  avg_dispatch_time_seconds?: number | null;
  reliability_score?: number | null;
  revenue: number;
}

export interface SuppliersAnalyticsResponse {
  suppliers: SupplierPerformancePoint[];
}

export interface SupplierGeoPoint {
  supplier_id: number;
  supplier_name: string;
  latitude: number;
  longitude: number;
  total_stock: number;
  stock_band: "high" | "medium" | "low";
}

export interface BuyerGeoPoint {
  buyer_id: number;
  buyer_name: string;
  latitude: number;
  longitude: number;
  order_count: number;
  region: string;
}

export interface GeoAnalyticsResponse {
  suppliers: SupplierGeoPoint[];
  buyers: BuyerGeoPoint[];
}
