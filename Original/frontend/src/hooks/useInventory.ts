import { useCallback, useEffect, useState } from 'react';

import {
  addInventoryItem,
  deleteInventoryItem,
  getInventory,
  updateInventoryItem,
  updatePickTime,
} from '@/services/api';
import type {
  CreateInventoryItemInput,
  InventoryItem,
  InventoryResponse,
  UpdateInventoryItemInput,
} from '@/types';

interface UseInventoryResult {
  supplierId: string | null;
  pickTimeMinutes: number;
  items: InventoryItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addItem: (payload: CreateInventoryItemInput) => Promise<void>;
  editItem: (itemId: string, payload: UpdateInventoryItemInput) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  savePickTime: (minutes: number) => Promise<void>;
}

export function useInventory(): UseInventoryResult {
  const [inventory, setInventory] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInventory();
      setInventory(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = useCallback(
    async (payload: CreateInventoryItemInput) => {
      setError(null);
      try {
        await addInventoryItem(payload);
        await fetchInventory();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Failed to add inventory item');
      }
    },
    [fetchInventory],
  );

  const editItem = useCallback(
    async (itemId: string, payload: UpdateInventoryItemInput) => {
      setError(null);
      try {
        await updateInventoryItem(itemId, payload);
        await fetchInventory();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Failed to update inventory item');
      }
    },
    [fetchInventory],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      setError(null);
      try {
        await deleteInventoryItem(itemId);
        await fetchInventory();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Failed to delete inventory item');
      }
    },
    [fetchInventory],
  );

  const savePickTime = useCallback(
    async (minutes: number) => {
      setError(null);
      try {
        await updatePickTime(minutes);
        await fetchInventory();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Failed to update pick time');
      }
    },
    [fetchInventory],
  );

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  return {
    supplierId: inventory?.supplierId ?? null,
    pickTimeMinutes: inventory?.pickTimeMinutes ?? 30,
    items: inventory?.items ?? [],
    loading,
    error,
    refetch: fetchInventory,
    addItem,
    editItem,
    removeItem,
    savePickTime,
  };
}
