import { apiFetch } from "./client";

export type BuyerSummary = {
  active_orders: number;
  pending_deliveries: number;
  avg_delivery_hours: number;
  total_spend: number;
};

export type BuyerRoute = {
  order_id: number;
  status: string;
  eta: string | null;
  buyer: { lat: number; lng: number };
  supplier: { lat: number; lng: number; name?: string };
  geometry: [number, number][];
};

export type SupplierSummary = {
  reliability_pct: number;
  orders_fulfilled_month: number;
  avg_dispatch_hours: number;
  revenue_month: number;
};

export type SupplierInventoryStats = {
  category_breakdown: { category: string; quantity: number; value: number }[];
  low_stock: {
    id: number;
    part_name: string;
    part_number: string;
    quantity_in_stock: number;
    min_order_quantity: number;
  }[];
  total_catalog_value: number;
};

export async function getBuyerSummary() {
  return apiFetch<BuyerSummary>("/api/analytics/buyer/summary");
}

export async function getBuyerOrderMap() {
  return apiFetch<{ routes: BuyerRoute[] }>("/api/analytics/buyer/order-map-data");
}

export async function getSupplierSummary() {
  return apiFetch<SupplierSummary>("/api/analytics/supplier/summary");
}

export async function getSupplierInventoryStats() {
  return apiFetch<SupplierInventoryStats>("/api/analytics/supplier/inventory-stats");
}
