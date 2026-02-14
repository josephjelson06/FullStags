import { useCallback, useEffect, useState } from 'react';

import { getRoute } from '@/services/api';
import type { RouteData } from '@/types';

interface UseRouteResult {
  route: RouteData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRoute(orderId?: string): UseRouteResult {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async () => {
    if (!orderId) {
      setRoute(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getRoute(orderId);
      setRoute(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load route');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void fetchRoute();
  }, [fetchRoute]);

  useEffect(() => {
    if (!orderId) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void fetchRoute();
    }, 10_000);

    return () => window.clearInterval(timer);
  }, [fetchRoute, orderId]);

  return {
    route,
    loading,
    error,
    refetch: fetchRoute,
  };
}
