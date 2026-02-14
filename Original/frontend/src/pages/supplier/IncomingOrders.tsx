import { DataTable, type DataColumn } from '@/components/DataTable';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { useOrders } from '@/hooks/useOrders';
import type { Order } from '@/types';

export function IncomingOrders() {
  const { orders, loading, error, refetch, runAction } = useOrders('active');

  const columns: DataColumn<Order>[] = [
    {
      header: 'Part',
      render: (row) => <span className="font-medium">{row.partName}</span>,
    },
    {
      header: 'Buyer',
      render: (row) => <span className="text-text-secondary">{row.buyerCompany ?? '--'}</span>,
    },
    {
      header: 'Urgency',
      render: (row) => (row.urgency ? <Badge variant={row.urgency} /> : <span className="text-text-muted">--</span>),
    },
    {
      header: 'Distance',
      render: (row) => (
        <span className="font-semibold">
          {typeof row.distanceKm === 'number' ? `${row.distanceKm.toFixed(1)} km` : '--'}
        </span>
      ),
    },
    {
      header: 'Accept Window',
      render: (row) =>
        row.status === 'pending_acceptance' ? (
          <span className="font-semibold" style={{ color: 'var(--color-warning)' }}>
            {row.acceptDeadlineMinutes?.toFixed(1) ?? 0} min
          </span>
        ) : (
          <span className="text-text-muted">--</span>
        ),
    },
    {
      header: 'Actions',
      render: (row) => {
        if (row.status === 'pending_acceptance') {
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void runAction(row.orderId, 'accept')}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:shadow-md"
                style={{
                  background: 'linear-gradient(135deg, var(--color-success), #15803d)',
                  color: '#ffffff',
                }}
              >
                ✓ Accept
              </button>
              <button
                type="button"
                onClick={() => void runAction(row.orderId, 'decline')}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:shadow-xs"
                style={{
                  background: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  border: '1px solid var(--color-danger)',
                }}
              >
                ✕ Decline
              </button>
            </div>
          );
        }

        if (row.status === 'picking') {
          return (
            <button
              type="button"
              onClick={() => void runAction(row.orderId, 'ready')}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:shadow-md"
              style={{ background: 'var(--gradient-primary)', color: 'var(--color-text-on-primary)' }}
            >
              📦 Ready for Pickup
            </button>
          );
        }

        return <span className="text-xs text-text-muted">In progress</span>;
      },
    },
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        title="Incoming Orders"
        subtitle="Accept or decline urgent orders, then mark parts ready for courier pickup."
      />

      {error ? <ErrorBanner message={error} onRetry={() => void refetch()} /> : null}

      <DataTable
        columns={columns}
        data={orders}
        rowKey={(row) => row.orderId}
        loading={loading}
        emptyTitle="No incoming supplier orders"
        emptyDescription="New urgent requests assigned to your warehouse will appear here."
      />
    </section>
  );
}
