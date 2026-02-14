export type PartCategory = {
  id: number;
  name: string;
  subcategory?: string | null;
};

export type CatalogEntry = {
  id: number;
  supplier_id: number;
  category_id: number;
  part_name: string;
  part_number: string;
  normalized_part_number: string;
  brand?: string | null;
  unit_price: number;
  quantity_in_stock: number;
  min_order_quantity: number;
  lead_time_hours: number;
  created_at?: string | null;
  updated_at?: string | null;
  supplier_business_name?: string | null;
  category_name?: string | null;
  distance_km?: number | null;
};

export type CatalogListResponse = {
  items: CatalogEntry[];
  page: number;
  page_size: number;
  total: number;
};

export type InventoryTransaction = {
  catalog_id: number;
  change_amount: number;
  reason: string;
  created_at?: string | null;
};

export type CSVUploadError = {
  row_number: number;
  error: string;
  row_data?: Record<string, string> | null;
};

export type CSVUploadResponse = {
  total_rows: number;
  successful: number;
  failed: number;
  errors: CSVUploadError[];
};

export type SupplierProfile = {
  id: number;
  user_id: number;
  business_name: string;
  warehouse_address?: string | null;
  gst_number?: string | null;
  service_radius_km: number;
  latitude: number;
  longitude: number;
  reliability_score: number;
  distance_km?: number | null;
};

export type SupplierSummary = SupplierProfile & {
  total_parts: number;
  total_stock_value: number;
  avg_lead_time_hours: number;
};

export type CartItem = {
  catalog_id: number;
  part_name: string;
  part_number: string;
  supplier_name: string;
  unit_price: number;
  quantity: number;
};
