import { DataTable, type DataColumn } from '@/components/DataTable';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/Badge';
import { useOrders } from '@/hooks/useOrders';
import type { Order } from '@/types';

function getProposedAssignmentId(order: Order): string | null {
  for (const item of order.items) {
    const assignment = item.assignments.find((row) => row.status === 'PROPOSED');
    if (assignment) {
      return String(assignment.id);
    }
  }
  return null;
}

function getDispatchableItemId(order: Order): string | null {
  const dispatchable = order.items.find((item) => item.status === 'CONFIRMED');
  return dispatchable ? String(dispatchable.id) : null;
}

function isUrgencyVariant(value: unknown): value is 'critical' | 'high' | 'urgent' | 'standard' {
  return value === 'critical' || value === 'high' || value === 'urgent' || value === 'standard';
}

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
      render: (row) => (isUrgencyVariant(row.urgency) ? <Badge variant={row.urgency} /> : <span className="text-text-muted">--</span>),
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
      header: 'Actions',
      render: (row) => {
        const proposedAssignmentId = getProposedAssignmentId(row);
        if (row.status === 'MATCHED' && proposedAssignmentId) {
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void runAction(row.orderId, 'accept', proposedAssignmentId)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:shadow-md"
                style={{
                  background: 'linear-gradient(135deg, var(--color-success), #15803d)',
                  color: '#ffffff',
                }}
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => void runAction(row.orderId, 'decline', proposedAssignmentId)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:shadow-xs"
                style={{
                  background: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  border: '1px solid var(--color-danger)',
                }}
              >
                Decline
              </button>
            </div>
          );
        }

        const dispatchableItemId = getDispatchableItemId(row);
        if (row.status === 'CONFIRMED' && dispatchableItemId) {
          return (
            <button
              type="button"
              onClick={() => void runAction(row.orderId, 'ready', dispatchableItemId)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:shadow-md"
              style={{ background: 'var(--gradient-primary)', color: 'var(--color-text-on-primary)' }}
            >
              Ready for Pickup
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
        subtitle="Accept matched assignments and mark confirmed items as dispatched."
      />

      {error ? <ErrorBanner message={error} onRetry={() => void refetch()} /> : null}

      <DataTable
        columns={columns}
        data={orders}
        rowKey={(row) => row.orderId}
        loading={loading}
        emptyTitle="No incoming supplier orders"
        emptyDescription="New backend-matched assignments will appear here."
      />
    </section>
  );
}
