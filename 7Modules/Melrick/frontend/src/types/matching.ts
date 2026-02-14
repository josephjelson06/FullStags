export type WeightProfile = {
  distance: number;
  reliability: number;
  price: number;
  urgency: number;
};

export type WeightProfiles = Record<string, WeightProfile>;

export type CatalogEntry = {
  id: number;
  supplier_id: number;
  category_id?: number;
  part_name: string;
  part_number: string;
  brand?: string;
  unit_price: number;
  quantity_in_stock: number;
  lead_time_hours: number;
};

export type SupplierScore = {
  supplier_id: number;
  business_name: string;
  distance_km: number;
  distance_score: number;
  reliability_score: number;
  price_score: number;
  urgency_score: number;
  total_score: number;
  catalog_entry: CatalogEntry;
};

export type MatchResult = {
  order_item_id: number;
  top_matches: SupplierScore[];
  selected_supplier_id?: number | null;
};

export type MatchLogEntry = {
  id: number;
  order_item_id: number;
  supplier_id: number;
  distance_km: number;
  distance_score: number;
  reliability_score: number;
  price_score: number;
  urgency_score: number;
  total_score: number;
  rank: number;
  created_at?: string;
};

export type OrderItemSummary = {
  id: number;
  part_number: string;
  part_description?: string;
  quantity: number;
  status: string;
};

export type OrderSummary = {
  id: number;
  status: string;
  urgency: string;
  required_delivery_date?: string | null;
  items: OrderItemSummary[];
};
