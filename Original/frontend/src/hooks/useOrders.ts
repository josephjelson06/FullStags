import { useCallback, useEffect, useState } from 'react';

import { getOrders, updateOrder } from '@/services/api';
import type { Order, OrderAction } from '@/types';

interface UseOrdersResult {
  orders: Order[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  runAction: (orderId: string, action: OrderAction, matchId?: string) => Promise<void>;
}

export function useOrders(status?: string): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrders(status);
      setOrders(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [status]);

  const runAction = useCallback(
    async (orderId: string, action: OrderAction, matchId?: string) => {
      setError(null);
      try {
        await updateOrder(orderId, action, matchId);
        await fetchOrders();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Failed to update order');
      }
    },
    [fetchOrders],
  );

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    runAction,
  };
}
