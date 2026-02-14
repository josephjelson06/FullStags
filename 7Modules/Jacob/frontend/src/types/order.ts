export type OrderItemCreate = {
  category_id: number;
  part_number: string;
  part_description?: string;
  quantity: number;
};

export type OrderCreatePayload = {
  items: OrderItemCreate[];
  urgency: "standard" | "urgent" | "critical";
  required_delivery_date?: string;
};

export type OrderAssignment = {
  id: number;
  order_item_id: number;
  supplier_id: number;
  catalog_id: number;
  assigned_price?: number | null;
  match_score?: number | null;
  status: "PROPOSED" | "ACCEPTED" | "REJECTED" | "FULFILLED";
  created_at?: string | null;
  supplier_business_name?: string | null;
  supplier_user_id?: number | null;
  supplier_latitude?: number | null;
  supplier_longitude?: number | null;
  distance_km?: number | null;
};

export type OrderItem = {
  id: number;
  order_id: number;
  category_id: number;
  part_number: string;
  part_description?: string | null;
  quantity: number;
  status:
    | "PENDING"
    | "MATCHED"
    | "CONFIRMED"
    | "DISPATCHED"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "CANCELLED";
  category_name?: string | null;
  assignments: OrderAssignment[];
};

export type OrderHistoryEntry = {
  order_item_id?: number | null;
  from_status?: string | null;
  to_status: string;
  timestamp?: string | null;
  changed_by?: number | null;
};

export type OrderRecord = {
  id: number;
  buyer_id: number;
  status:
    | "PLACED"
    | "MATCHED"
    | "CONFIRMED"
    | "DISPATCHED"
    | "IN_TRANSIT"
    | "DELIVERED"
    | "CANCELLED";
  urgency: "standard" | "urgent" | "critical";
  required_delivery_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  buyer_factory_name?: string | null;
  buyer_user_id?: number | null;
  buyer_latitude?: number | null;
  buyer_longitude?: number | null;
  total_items: number;
  total_value: number;
  items: OrderItem[];
  history: OrderHistoryEntry[];
};

export type OrdersListResponse = {
  items: OrderRecord[];
  page: number;
  page_size: number;
  total: number;
};
