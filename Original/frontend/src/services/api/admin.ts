import { request } from '@/services/api/client';
import type { DashboardMetrics } from '@/types';
import type { DashboardOverviewDto } from '@/services/api/contracts';

export async function getDashboard(): Promise<DashboardMetrics> {
  const overview = await request<DashboardOverviewDto>('/api/admin/dashboard');
  const totalOrders = overview.total_orders;
  const delivered = overview.delivered_orders;
  const openOrders = overview.open_orders;
  return {
    totalOrdersToday: totalOrders,
    averageMatchTimeSeconds: Math.round(overview.avg_match_score * 100),
    averageDeliveryTimeMinutes: Math.round(overview.optimization_savings_km || 0),
    fulfillmentRate: totalOrders > 0 ? delivered / totalOrders : 0,
    totalDowntimeSavedDollars: Math.round(overview.total_revenue_inr),
    activeOrdersCount: openOrders,
    pendingOrdersCount: openOrders,
  };
}
