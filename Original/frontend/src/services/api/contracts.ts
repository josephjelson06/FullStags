export type BackendRole = 'buyer' | 'supplier' | 'admin';
export type BackendOrderStatus =
  | 'PLACED'
  | 'MATCHED'
  | 'CONFIRMED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export interface AuthTokenDto {
  access_token: string;
  token_type: string;
  role: BackendRole;
  user_id: number;
}

export interface UserProfileDto {
  user_id: number;
  email: string;
  role: BackendRole;
  is_active: boolean;
  created_at: string;
  profile_id: number | null;
  factory_name: string | null;
  industry_type: string | null;
  delivery_address: string | null;
  business_name: string | null;
  warehouse_address: string | null;
  gst_number: string | null;
  service_radius_km: number | null;
  reliability_score: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface RegisterBuyerDto {
  email: string;
  password: string;
  factory_name: string;
  industry_type?: string;
  delivery_address?: string;
  latitude: number;
  longitude: number;
}

export interface RegisterSupplierDto {
  email: string;
  password: string;
  business_name: string;
  warehouse_address?: string;
  gst_number?: string;
  service_radius_km?: number;
  latitude: number;
  longitude: number;
}

export interface PartCategoryDto {
  id: number;
  name: string;
  subcategory: string | null;
}

export interface CatalogEntryDto {
  id: number;
  supplier_id: number;
  category_id: number;
  part_name: string;
  part_number: string;
  normalized_part_number: string;
  brand: string | null;
  unit_price: number;
  quantity_in_stock: number;
  min_order_quantity: number;
  lead_time_hours: number;
  created_at: string | null;
  updated_at: string | null;
  supplier_business_name: string | null;
  category_name: string | null;
  distance_km: number | null;
}

export interface CatalogListDto {
  items: CatalogEntryDto[];
  page: number;
  page_size: number;
  total: number;
}

export interface InventoryTransactionDto {
  catalog_id: number;
  change_amount: number;
  reason: string;
  created_at: string | null;
}

export interface CsvUploadErrorDto {
  row_number: number;
  error: string;
  row_data?: Record<string, unknown> | null;
}

export interface CsvUploadResponseDto {
  total_rows: number;
  successful: number;
  failed: number;
  errors: CsvUploadErrorDto[];
}

export interface SupplierProfileDto {
  id: number;
  user_id: number;
  business_name: string;
  warehouse_address: string | null;
  gst_number: string | null;
  service_radius_km: number;
  latitude: number;
  longitude: number;
  reliability_score: number;
  distance_km: number | null;
}

export interface SupplierSummaryDto extends SupplierProfileDto {
  total_parts: number;
  total_stock_value: number;
  avg_lead_time_hours: number;
}

export interface OrderCreateItemDto {
  category_id: number;
  part_number: string;
  part_description?: string;
  quantity: number;
}

export interface OrderCreateDto {
  items: OrderCreateItemDto[];
  urgency: 'standard' | 'urgent' | 'critical';
  required_delivery_date?: string;
}

export interface StatusTransitionDto {
  new_status: BackendOrderStatus;
}

export interface OrderAssignmentDto {
  id: number;
  order_item_id: number;
  supplier_id: number;
  catalog_id: number;
  assigned_price: number | null;
  match_score: number | null;
  status: string;
  created_at: string | null;
  supplier_business_name: string | null;
  supplier_user_id: number | null;
  supplier_latitude: number | null;
  supplier_longitude: number | null;
  distance_km: number | null;
}

export interface OrderItemDto {
  id: number;
  order_id: number;
  category_id: number;
  part_number: string;
  part_description: string | null;
  quantity: number;
  status: string;
  category_name: string | null;
  assignments: OrderAssignmentDto[];
}

export interface OrderHistoryDto {
  order_item_id: number | null;
  from_status: string | null;
  to_status: string;
  timestamp: string | null;
  changed_by: number | null;
}

export interface OrderDto {
  id: number;
  buyer_id: number;
  status: BackendOrderStatus;
  urgency: string;
  required_delivery_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  buyer_factory_name: string | null;
  buyer_user_id: number | null;
  buyer_latitude: number | null;
  buyer_longitude: number | null;
  total_items: number;
  total_value: number;
  items: OrderItemDto[];
  history: OrderHistoryDto[];
}

export interface OrdersListDto {
  items: OrderDto[];
  page: number;
  page_size: number;
  total: number;
}

export interface NotificationDto {
  id: number;
  user_id: number;
  event_type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationListDto {
  items: NotificationDto[];
  limit: number;
  offset: number;
  total: number;
}

export interface MarkAllReadDto {
  updated: number;
}

export interface NotificationTemplateDto {
  id: number;
  name: string;
  type: string;
  subject: string;
  body: string;
  is_active?: boolean;
  created_at: string | null;
}

export interface DeliveryStopDto {
  id: number;
  delivery_id: number;
  order_assignment_id: number | null;
  stop_type: string;
  sequence_order: number;
  latitude: number;
  longitude: number;
  time_window_start: string | null;
  time_window_end: string | null;
  eta: string | null;
}

export interface DeliveryDto {
  id: number;
  delivery_type: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | string;
  total_distance_km: number | null;
  total_duration_minutes: number | null;
  optimized_distance_km: number | null;
  naive_distance_km: number | null;
  route_geometry: GeoJsonLineString | null;
  created_at: string | null;
  stops: DeliveryStopDto[];
  latest_eta: string | null;
}

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface DeliveryStatsDto {
  avg_distance_km: number;
  avg_duration_minutes: number;
  total_savings_km: number;
  total_savings_percent: number;
}

export interface AvailableAssignmentDto {
  id: number;
  order_id: number;
  order_item_id: number;
  part_number: string;
  quantity: number;
  supplier_id: number;
  supplier_name: string;
  buyer_factory_name: string;
  required_delivery_date: string | null;
}

export interface MatchingLogDto {
  id: number;
  order_item_id: number;
  supplier_id: number;
  supplier_name: string;
  rank: number;
  score: number;
  price_score: number;
  distance_score: number;
  reliability_score: number;
  lead_time_score: number;
  created_at: string;
}

export interface MatchingConfigDto {
  weight_profiles: Record<
    string,
    {
      price: number;
      distance: number;
      reliability: number;
      lead_time: number;
    }
  >;
}

export interface MatchResultDto {
  order_item_id: number;
  part_name: string;
  candidates: Array<{
    supplier_id: number;
    supplier_name: string;
    catalog_id: number;
    score: number;
    price: number;
    lead_time_hours: number;
    distance_km: number;
    reliability_score: number;
  }>;
}

export interface DashboardOverviewDto {
  total_orders: number;
  open_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  active_deliveries: number;
  total_revenue_inr: number;
  avg_match_score: number;
  avg_supplier_reliability: number;
  low_stock_items: number;
  optimization_savings_km: number;
  optimization_savings_percent: number;
}

export interface DemandAnalyticsDto {
  orders_by_status: Array<{ status: string; count: number }>;
  matching: {
    total_items_scored: number;
    avg_candidates_per_item: number;
    avg_top_score: number;
    avg_selected_score: number;
    urgency_top_score: Record<string, number>;
  };
}

export interface RouteAnalyticsDto {
  total_deliveries: number;
  planned_deliveries: number;
  in_progress_deliveries: number;
  completed_deliveries: number;
  avg_distance_km: number;
  avg_duration_minutes: number;
  total_naive_distance_km: number;
  total_optimized_distance_km: number;
  total_savings_km: number;
  total_savings_percent: number;
}

export interface SupplierAnalyticsDto {
  suppliers: Array<{
    supplier_id: number;
    supplier_name: string;
    reliability_score: number;
    assignments_total: number;
    fulfilled_assignments: number;
    rejected_assignments: number;
    fulfillment_rate: number;
    avg_match_score: number;
  }>;
}

export interface GeoAnalyticsDto {
  low_stock: Array<{
    catalog_id: number;
    supplier_id: number;
    supplier_name: string;
    part_number: string;
    part_name: string;
    current_stock: number;
    reorder_point: number;
  }>;
}
