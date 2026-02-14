export type GeoLineString = {
  type: "LineString";
  coordinates: number[][];
};

export type DeliveryStop = {
  id: number;
  delivery_id: number;
  order_assignment_id?: number | null;
  stop_type: "pickup" | "dropoff";
  sequence_order: number;
  latitude: number;
  longitude: number;
  time_window_start?: string | null;
  time_window_end?: string | null;
  eta?: string | null;
};

export type DeliveryResponse = {
  id: number;
  delivery_type: "single" | "batched";
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  total_distance_km?: number | null;
  total_duration_minutes?: number | null;
  optimized_distance_km?: number | null;
  naive_distance_km?: number | null;
  route_geometry?: GeoLineString | null;
  created_at?: string | null;
  stops: DeliveryStop[];
  latest_eta?: string | null;
};

export type AvailableAssignment = {
  id: number;
  order_id: number;
  order_item_id: number;
  part_number: string;
  quantity: number;
  supplier_id: number;
  supplier_name: string;
  buyer_factory_name: string;
  required_delivery_date?: string | null;
};

export type DeliveryStats = {
  avg_distance_km: number;
  avg_duration_minutes: number;
  total_savings_km: number;
  total_savings_percent: number;
};

export type VRPBatchResult = {
  deliveries_created: DeliveryResponse[];
  total_savings_km: number;
  total_savings_percent: number;
};
