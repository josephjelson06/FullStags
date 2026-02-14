export type KPIOverview = {
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
};

export type StatusCount = {
  status: string;
  count: number;
};

export type MatchingAnalytics = {
  total_items_scored: number;
  avg_candidates_per_item: number;
  avg_top_score: number;
  avg_selected_score: number;
  urgency_top_score: Record<string, number>;
};

export type DeliveryAnalytics = {
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
};

export type SupplierPerformance = {
  supplier_id: number;
  supplier_name: string;
  reliability_score: number;
  assignments_total: number;
  fulfilled_assignments: number;
  rejected_assignments: number;
  fulfillment_rate: number;
  avg_match_score: number;
};

export type InventoryRiskItem = {
  catalog_id: number;
  supplier_id: number;
  supplier_name: string;
  part_number: string;
  part_name: string;
  current_stock: number;
  reorder_point: number;
};

export type EventTimelinePoint = {
  day: string;
  event_type: string;
  count: number;
};

export type AnalyticsSnapshot = {
  overview: KPIOverview;
  orders: StatusCount[];
  matching: MatchingAnalytics;
  deliveries: DeliveryAnalytics;
  suppliers: SupplierPerformance[];
  low_stock: InventoryRiskItem[];
  events: EventTimelinePoint[];
};
