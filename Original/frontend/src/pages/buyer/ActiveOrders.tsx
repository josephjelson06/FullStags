import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/Badge';
import { DataTable, type DataColumn } from '@/components/DataTable';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import type { Order } from '@/types';
import { getOrderDetailPath } from '@/utils/routes';

export function ActiveOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orders, loading, error, refetch, runAction } = useOrders('active');

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refetch();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [refetch]);

  const columns: DataColumn<Order>[] = [
    {
      header: 'Order',
      render: (row) => (
        <button
          type="button"
          onClick={() => navigate(getOrderDetailPath(user?.role ?? 'buyer', row.orderId))}
          className="font-semibold transition-colors hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          {row.partName}
        </button>
      ),
    },
    {
      header: 'Status',
      render: (row) => <Badge variant={row.status} />,
    },
    {
      header: 'Supplier',
      render: (row) => (
        <span className="text-text-secondary">{row.supplierName ?? 'Pending selection'}</span>
      ),
    },
    {
      header: 'ETA',
      render: (row) => (
        <span className="font-semibold">{row.etaMinutesRemaining ?? 0} min</span>
      ),
    },
    {
      header: 'Actions',
      render: (row) =>
        row.status === 'IN_TRANSIT' ? (
          <button
            type="button"
            onClick={() => void runAction(row.orderId, 'delivered')}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:shadow-sm"
            style={{
              background: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              border: '1px solid var(--color-success)',
            }}
          >
            ✓ Mark as Received
          </button>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        ),
    },
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        title="My Active Orders"
        subtitle="Track live ETA and mark deliveries once parts arrive."
        action={
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="animate-pulse-dot inline-block h-2 w-2 rounded-full" style={{ background: 'var(--color-success)' }} />
            Auto-refreshing
          </div>
        }
      />
      {error ? <ErrorBanner message={error} onRetry={() => void refetch()} /> : null}
      <DataTable
        columns={columns}
        data={orders}
        rowKey={(row) => row.orderId}
        loading={loading}
        emptyTitle="No active orders"
        emptyDescription="Create an emergency request to begin sourcing parts."
      />
    </section>
  );
}
