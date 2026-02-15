import { useCallback, useEffect, useState } from 'react';

import {
  confirmOrderAssignment,
  getOrder,
  getOrders,
  rejectOrderAssignment,
  transitionItemStatus,
  transitionOrderStatus,
} from '@/services/api';
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
        if (action === 'accept') {
          if (!matchId) {
            throw new Error('Assignment id is required to accept.');
          }
          await confirmOrderAssignment(Number(matchId));
        } else if (action === 'decline') {
          if (!matchId) {
            throw new Error('Assignment id is required to decline.');
          }
          await rejectOrderAssignment(Number(matchId));
        } else if (action === 'ready') {
          if (!matchId) {
            throw new Error('Order item id is required to dispatch.');
          }
          await transitionItemStatus(Number(matchId), 'DISPATCHED');
        } else if (action === 'delivered') {
          await transitionOrderStatus(orderId, 'DELIVERED');
        } else if (action === 'cancel') {
          await transitionOrderStatus(orderId, 'CANCELLED');
        } else {
          throw new Error(`Unsupported action: ${action}`);
        }

        if (action === 'accept' || action === 'decline') {
          await getOrder(orderId);
        }
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
