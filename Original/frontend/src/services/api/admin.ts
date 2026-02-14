import { request } from '@/services/api/client';
import type { DashboardMetrics } from '@/types';

export async function getDashboard(): Promise<DashboardMetrics> {
  return request<DashboardMetrics>('/api/admin/dashboard');
}
