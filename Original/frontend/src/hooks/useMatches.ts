import { useCallback, useEffect, useState } from 'react';

import { getMatches } from '@/services/api';
import type { SupplierMatch } from '@/types';

interface UseMatchesResult {
  matches: SupplierMatch[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMatches(orderId?: string): UseMatchesResult {
  const [matches, setMatches] = useState<SupplierMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!orderId) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getMatches(orderId);
      setMatches(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void fetchMatches();
  }, [fetchMatches]);

  return {
    matches,
    loading,
    error,
    refetch: fetchMatches,
  };
}
