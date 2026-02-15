import { request } from '@/services/api/client';
import type {
  CatalogEntryDto,
  CatalogListDto,
  CsvUploadResponseDto,
  InventoryTransactionDto,
  PartCategoryDto,
  SupplierProfileDto,
} from '@/services/api/contracts';
import { toInventoryItem, toInventoryResponse } from '@/services/adapters/inventoryAdapter';
import type {
  CreateInventoryItemInput,
  InventoryItem,
  InventoryResponse,
  UpdateInventoryItemInput,
  UpdatePickTimeResponse,
} from '@/types';

export async function getInventoryCatalog(page = 1, pageSize = 100): Promise<CatalogListDto> {
  return request<CatalogListDto>(`/api/inventory/catalog?page=${page}&page_size=${pageSize}`);
}

export async function getInventory(): Promise<InventoryResponse> {
  const [catalog, supplierProfile] = await Promise.all([
    getInventoryCatalog(),
    request<SupplierProfileDto>('/api/suppliers/me').catch(() => null),
  ]);
  return toInventoryResponse(catalog, supplierProfile);
}

function toCatalogPayload(input: CreateInventoryItemInput | UpdateInventoryItemInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if ('categoryId' in input && input.categoryId != null) {
    payload.category_id = input.categoryId;
  }
  if ('partName' in input && input.partName != null) {
    payload.part_name = input.partName;
  }
  if ('partNumber' in input && input.partNumber != null) {
    payload.part_number = input.partNumber;
  }
  if ('brand' in input && input.brand != null) {
    payload.brand = input.brand;
  }
  if ('quantity' in input && input.quantity != null) {
    payload.quantity_in_stock = input.quantity;
  }
  if ('minOrderQuantity' in input && input.minOrderQuantity != null) {
    payload.min_order_quantity = input.minOrderQuantity;
  }
  if ('leadTimeHours' in input && input.leadTimeHours != null) {
    payload.lead_time_hours = input.leadTimeHours;
  }
  if ('price' in input && input.price != null) {
    payload.unit_price = input.price;
  }
  return payload;
}

export async function addInventoryItem(data: CreateInventoryItemInput): Promise<InventoryItem> {
  const response = await request<CatalogEntryDto>('/api/inventory/catalog', {
    method: 'POST',
    body: JSON.stringify(toCatalogPayload(data)),
  });
  return toInventoryItem(response);
}

export async function updateInventoryItem(itemId: string, data: UpdateInventoryItemInput): Promise<InventoryItem> {
  const response = await request<CatalogEntryDto>(`/api/inventory/catalog/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(toCatalogPayload(data)),
  });
  return toInventoryItem(response);
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  await request<unknown>(`/api/inventory/catalog/${itemId}`, {
    method: 'DELETE',
  });
}

export async function uploadCatalogCsv(file: File): Promise<CsvUploadResponseDto> {
  const formData = new FormData();
  formData.append('file', file);
  return request<CsvUploadResponseDto>('/api/inventory/catalog/csv-upload', {
    method: 'POST',
    body: formData,
  });
}

export async function getLowStockCatalog(): Promise<CatalogEntryDto[]> {
  return request<CatalogEntryDto[]>('/api/inventory/low-stock');
}

export async function listPartCategories(): Promise<PartCategoryDto[]> {
  return request<PartCategoryDto[]>('/api/inventory/categories');
}

export async function getCatalogTransactions(catalogId: number): Promise<InventoryTransactionDto[]> {
  return request<InventoryTransactionDto[]>(`/api/inventory/transactions/${catalogId}`);
}

export async function updatePickTime(minutes: number): Promise<UpdatePickTimeResponse> {
  return {
    supplierId: '0',
    pickTimeMinutes: minutes,
    updatedAt: new Date().toISOString(),
  };
}
