import { request } from '@/services/api/client';

export interface SupplierProfile {
  id: number;
  user_id: number;
  business_name: string;
  warehouse_address: string;
  gst_number: string;
  service_radius_km: number;
  latitude: number;
  longitude: number;
  reliability_score: number;
  distance_km?: number;
}

export interface SupplierSummary extends SupplierProfile {
  total_parts: number;
  total_stock_value: number;
  avg_lead_time_hours: number;
}

export async function getSuppliers(): Promise<SupplierProfile[]> {
  return request<SupplierProfile[]>('/api/suppliers');
}

export async function getMySupplierProfile(): Promise<SupplierProfile> {
  return request<SupplierProfile>('/api/suppliers/me');
}

export async function getNearbySuppliers(lat: number, lng: number, radiusKm = 50): Promise<SupplierProfile[]> {
  return request<SupplierProfile[]>(
    `/api/suppliers/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`
  );
}

export async function getSupplier(supplierId: number): Promise<SupplierSummary> {
  return request<SupplierSummary>(`/api/suppliers/${supplierId}`);
}

export async function getSupplierCatalog(supplierId: number, page = 1, pageSize = 20): Promise<{
  items: unknown[];
  page: number;
  page_size: number;
  total: number;
}> {
  return request(`/api/suppliers/${supplierId}/catalog?page=${page}&page_size=${pageSize}`);
}
