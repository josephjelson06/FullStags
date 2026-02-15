import { request } from '@/services/api/client';
import type {
  DashboardOverviewDto,
  DemandAnalyticsDto,
  GeoAnalyticsDto,
  RouteAnalyticsDto as RouteAnalyticsRawDto,
  SupplierAnalyticsDto as SupplierAnalyticsRawDto,
} from '@/services/api/contracts';

export interface AnalyticsKpis {
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

export interface DemandAnalytics {
  orders_by_status: { status: string; count: number }[];
  by_urgency: { urgency: string; count: number }[];
  matching: DemandAnalyticsDto['matching'];
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
  low_stock: GeoAnalyticsDto['low_stock'];
}

function mapDemand(raw: DemandAnalyticsDto): DemandAnalytics {
  return {
    orders_by_status: raw.orders_by_status,
    by_urgency: raw.matching.urgency_top_score
      ? Object.entries(raw.matching.urgency_top_score).map(([urgency, count]) => ({
        urgency,
        count: Math.round(count),
      }))
      : [],
    matching: raw.matching,
  };
}

function mapRoutes(raw: RouteAnalyticsRawDto): RouteAnalytics {
  return {
    total_distance_km: raw.total_optimized_distance_km,
    total_savings_km: raw.total_savings_km,
    avg_stops_per_delivery: raw.total_deliveries > 0 ? raw.total_deliveries / Math.max(1, raw.completed_deliveries) : 0,
    deliveries_by_status: [
      { status: 'PLANNED', count: raw.planned_deliveries },
      { status: 'IN_PROGRESS', count: raw.in_progress_deliveries },
      { status: 'COMPLETED', count: raw.completed_deliveries },
    ],
  };
}

function mapSuppliers(raw: SupplierAnalyticsRawDto): SupplierAnalytics {
  const suppliers = raw.suppliers ?? [];
  const avgReliability = suppliers.length > 0
    ? suppliers.reduce((acc, row) => acc + row.reliability_score, 0) / suppliers.length
    : 0;

  return {
    top_suppliers: suppliers.map((supplier) => ({
      supplier_id: supplier.supplier_id,
      name: supplier.supplier_name,
      orders_fulfilled: supplier.fulfilled_assignments,
      reliability_score: supplier.reliability_score,
      avg_lead_time: supplier.avg_match_score,
    })),
    avg_reliability: avgReliability,
  };
}

export async function getAnalyticsKpis(): Promise<AnalyticsKpis> {
  return request<DashboardOverviewDto>('/api/analytics/kpis');
}

export async function getDemandAnalytics(): Promise<DemandAnalytics> {
  const response = await request<DemandAnalyticsDto>('/api/analytics/demand');
  return mapDemand(response);
}

export async function getRouteAnalytics(): Promise<RouteAnalytics> {
  const response = await request<RouteAnalyticsRawDto>('/api/analytics/routes');
  return mapRoutes(response);
}

export async function getSupplierAnalytics(): Promise<SupplierAnalytics> {
  const response = await request<SupplierAnalyticsRawDto>('/api/analytics/suppliers');
  return mapSuppliers(response);
}

export async function getGeoAnalytics(): Promise<GeoAnalytics> {
  return request<GeoAnalytics>('/api/analytics/geo');
}
