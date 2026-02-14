import { request } from '@/services/api/client';
import type {
  CreateInventoryItemInput,
  InventoryItem,
  InventoryResponse,
  UpdateInventoryItemInput,
  UpdatePickTimeResponse,
} from '@/types';

export async function getInventory(): Promise<InventoryResponse> {
  return request<InventoryResponse>('/api/inventory');
}

export async function addInventoryItem(data: CreateInventoryItemInput): Promise<InventoryItem> {
  return request<InventoryItem>('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInventoryItem(itemId: string, data: UpdateInventoryItemInput): Promise<InventoryItem> {
  return request<InventoryItem>(`/api/inventory/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  await request<unknown>(`/api/inventory/${itemId}`, {
    method: 'DELETE',
  });
}

export async function updatePickTime(minutes: number): Promise<UpdatePickTimeResponse> {
  return request<UpdatePickTimeResponse>('/api/suppliers/me', {
    method: 'PATCH',
    body: JSON.stringify({ pickTimeMinutes: minutes }),
  });
}
