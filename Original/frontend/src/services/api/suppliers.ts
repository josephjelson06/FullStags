import { request } from '@/services/api/client';
import type {
  CatalogListDto,
  SupplierProfileDto,
  SupplierSummaryDto,
} from '@/services/api/contracts';

export type SupplierProfile = SupplierProfileDto;
export type SupplierSummary = SupplierSummaryDto;

export async function getSuppliers(): Promise<SupplierProfile[]> {
  return request<SupplierProfile[]>('/api/suppliers');
}

export async function getMySupplierProfile(): Promise<SupplierProfile> {
  return request<SupplierProfile>('/api/suppliers/me');
}

export async function getNearbySuppliers(lat: number, lng: number, radiusKm = 50): Promise<SupplierProfile[]> {
  return request<SupplierProfile[]>(
    `/api/suppliers/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`,
  );
}

export async function getSupplier(supplierId: number): Promise<SupplierSummary> {
  return request<SupplierSummary>(`/api/suppliers/${supplierId}`);
}

export async function getSupplierCatalog(supplierId: number, page = 1, pageSize = 100): Promise<CatalogListDto> {
  return request<CatalogListDto>(`/api/suppliers/${supplierId}/catalog?page=${page}&page_size=${pageSize}`);
}
