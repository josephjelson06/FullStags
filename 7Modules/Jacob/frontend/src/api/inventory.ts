import { apiFetch } from "./client";
import {
  CatalogEntry,
  CatalogListResponse,
  CSVUploadResponse,
  InventoryTransaction,
  PartCategory,
  SupplierSummary,
} from "../types/inventory";

export type CatalogPayload = {
  category_id: number;
  part_name: string;
  part_number: string;
  brand?: string;
  unit_price: number;
  quantity_in_stock: number;
  min_order_quantity: number;
  lead_time_hours: number;
};

export const listOwnCatalog = (page = 1, pageSize = 100) =>
  apiFetch<CatalogListResponse>(
    `/api/inventory/catalog?page=${page}&page_size=${pageSize}`
  );

export const listCategories = () => apiFetch<PartCategory[]>(`/api/inventory/categories`);

export const createCatalogEntry = (payload: CatalogPayload) =>
  apiFetch<CatalogEntry>(`/api/inventory/catalog`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateCatalogEntry = (id: number, payload: Partial<CatalogPayload>) =>
  apiFetch<CatalogEntry>(`/api/inventory/catalog/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteCatalogEntry = (id: number) =>
  apiFetch<void>(`/api/inventory/catalog/${id}`, {
    method: "DELETE",
  });

export const uploadCatalogCsv = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<CSVUploadResponse>(
    `/api/inventory/catalog/csv-upload`,
    {
      method: "POST",
      body: form,
    },
    true
  );
};

export const searchParts = (
  query: string,
  lat: number,
  lng: number,
  radiusKm: number,
  categoryId?: number
) => {
  const params = new URLSearchParams({
    q: query,
    lat: String(lat),
    lng: String(lng),
    radius_km: String(radiusKm),
  });
  if (categoryId) {
    params.set("category_id", String(categoryId));
  }
  return apiFetch<CatalogEntry[]>(`/api/inventory/search?${params.toString()}`);
};

export const listLowStock = () => apiFetch<CatalogEntry[]>(`/api/inventory/low-stock`);

export const listRecentTransactions = (limit = 20) =>
  apiFetch<InventoryTransaction[]>(`/api/inventory/transactions?limit=${limit}`);

export const getSupplierSummary = (supplierId: number) =>
  apiFetch<SupplierSummary>(`/api/suppliers/${supplierId}`);

export const getCurrentSupplier = () => apiFetch<{ id: number }>(`/api/suppliers/me`);

export const listCatalogTransactions = (catalogId: number) =>
  apiFetch<InventoryTransaction[]>(`/api/inventory/transactions/${catalogId}`);
