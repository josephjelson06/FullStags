import { request } from '@/services/api/client';

export interface AnalyticsKpis {
  total_orders: number;
  total_revenue: number;
  active_suppliers: number;
  active_buyers: number;
  avg_fulfillment_time_hours: number;
  match_rate_percent: number;
  delivery_completion_rate: number;
  total_deliveries: number;
  route_savings_percent: number;
}

export interface DemandAnalytics {
  daily_orders: { date: string; count: number }[];
  by_urgency: { urgency: string; count: number }[];
  by_category: { category: string; count: number }[];
}

export interface RouteAnalytics {
  total_distance_km: number;
  total_savings_km: number;
  avg_stops_per_delivery: number;
  deliveries_by_status: { status: string; count: number }[];
}

export interface SupplierAnalytics {
  top_suppliers: {
    supplier_id: number;
    name: string;
    orders_fulfilled: number;
    reliability_score: number;
    avg_lead_time: number;
  }[];
  avg_reliability: number;
}

export interface GeoAnalytics {
  supplier_locations: {
    id: number;
    name: string;
    lat: number;
    lng: number;
    reliability: number;
  }[];
}

export async function getAnalyticsKpis(): Promise<AnalyticsKpis> {
  return request<AnalyticsKpis>('/api/analytics/kpis');
}

export async function getDemandAnalytics(): Promise<DemandAnalytics> {
  return request<DemandAnalytics>('/api/analytics/demand');
}

export async function getRouteAnalytics(): Promise<RouteAnalytics> {
  return request<RouteAnalytics>('/api/analytics/routes');
}

export async function getSupplierAnalytics(): Promise<SupplierAnalytics> {
  return request<SupplierAnalytics>('/api/analytics/suppliers');
}

export async function getGeoAnalytics(): Promise<GeoAnalytics> {
  return request<GeoAnalytics>('/api/analytics/geo');
}
