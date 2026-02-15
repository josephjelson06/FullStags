import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Badge } from '@/components/Badge';
import { ErrorBanner } from '@/components/ErrorBanner';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageHeader } from '@/components/PageHeader';
import { RouteMap } from '@/components/RouteMap';
import { useAuth } from '@/hooks/useAuth';
import { useRoute } from '@/hooks/useRoute';
import { getOrder, updateOrder } from '@/services/api';
import type { BackendOrderStatus, Order, UserRole } from '@/types';

const STATUS_FLOW: BackendOrderStatus[] = [
  'PLACED',
  'MATCHED',
  'CONFIRMED',
  'DISPATCHED',
  'IN_TRANSIT',
  'DELIVERED',
];

const STATUS_LABELS: Record<string, string> = {
  PLACED: 'Placed',
  MATCHED: 'Matched',
  CONFIRMED: 'Confirmed',
  DISPATCHED: 'Dispatched',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
};

function canMarkDelivered(role: UserRole, order: Order): boolean {
  return (role === 'buyer' || role === 'admin') && order.status === 'IN_TRANSIT';
}

function isUrgencyVariant(value: unknown): value is 'critical' | 'high' | 'urgent' | 'standard' {
  return value === 'critical' || value === 'high' || value === 'urgent' || value === 'standard';
}

export function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const { route, loading: routeLoading, error: routeError, refetch: refetchRoute } = useRoute(orderId);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setError('Order id is missing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getOrder(orderId);
      setOrder(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetchOrder();
      void refetchRoute();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [fetchOrder, refetchRoute]);

  const statusIndex = useMemo(
    () => (order ? STATUS_FLOW.findIndex((status) => status === order.status) : -1),
    [order],
  );

  const markDelivered = async () => {
    if (!orderId) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateOrder(orderId, 'delivered');
      await Promise.all([fetchOrder(), refetchRoute()]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to mark delivery');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="card" rows={3} />;
  if (!order) return <ErrorBanner message={error ?? 'Order not found'} onRetry={() => void fetchOrder()} />;

  return (
    <section className="space-y-6">
      <PageHeader
        title={`Order ${order.orderId}`}
        subtitle={`${order.partName} (${order.partNumber})`}
      />

      {error ? <ErrorBanner message={error} onRetry={() => void fetchOrder()} /> : null}
      {routeError ? <ErrorBanner message={routeError} onRetry={() => void refetchRoute()} /> : null}

      {/* Order Info Card */}
      <article className="surface-card rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={order.status} />
          {isUrgencyVariant(order.urgency) ? <Badge variant={order.urgency} /> : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl p-3" style={{ background: 'var(--color-surface-inset)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Supplier</p>
            <p className="mt-0.5 font-semibold text-text-primary">{order.supplierName ?? 'Not selected yet'}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--color-surface-inset)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">ETA</p>
            <p className="mt-0.5 font-semibold text-text-primary">{order.etaMinutesRemaining ?? 0} min</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--color-surface-inset)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Price</p>
            <p className="mt-0.5 font-semibold text-text-primary">{order.partPrice ? `$${order.partPrice.toFixed(2)}` : '--'}</p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="mt-6">
          <div className="flex items-center gap-1">
            {STATUS_FLOW.map((status, index) => {
              const isComplete = index <= statusIndex;
              const isCurrent = index === statusIndex;
              return (
                <div key={status} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full items-center">
                    {index > 0 ? (
                      <div
                        className="h-0.5 flex-1 rounded-full transition-colors"
                        style={{
                          background: isComplete ? 'var(--color-primary)' : 'var(--color-border)',
                        }}
                      />
                    ) : <div className="flex-1" />}
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all"
                      style={{
                        background: isComplete ? 'var(--color-primary)' : 'var(--color-surface-inset)',
                        color: isComplete ? 'var(--color-text-on-primary)' : 'var(--color-text-muted)',
                        boxShadow: isCurrent ? 'var(--shadow-glow)' : 'none',
                      }}
                    >
                      {isComplete ? '✓' : index + 1}
                    </div>
                    {index < STATUS_FLOW.length - 1 ? (
                      <div
                        className="h-0.5 flex-1 rounded-full transition-colors"
                        style={{
                          background: index < statusIndex ? 'var(--color-primary)' : 'var(--color-border)',
                        }}
                      />
                    ) : <div className="flex-1" />}
                  </div>
                  <span className="text-center text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                    {STATUS_LABELS[status]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {user && canMarkDelivered(user.role, order) ? (
          <button
            type="button"
            onClick={markDelivered}
            disabled={submitting}
            className="mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all hover:shadow-md disabled:opacity-70"
            style={{
              background: 'linear-gradient(135deg, var(--color-success), #15803d)',
              color: '#ffffff',
            }}
          >
            {submitting ? 'Updating...' : '✓ Mark as Received'}
          </button>
        ) : null}
      </article>

      {/* Route Map */}
      {route && order.supplier ? (
        <RouteMap
          supplierLocation={route.supplierLocation}
          factoryLocation={route.factoryLocation}
          courierLocation={route.courierCurrentLocation}
          legs={route.legs}
          etaMinutesRemaining={route.etaMinutesRemaining}
        />
      ) : routeLoading ? (
        <LoadingSkeleton variant="chart" />
      ) : (
        <div className="surface-card rounded-2xl border-dashed p-6 text-center">
          <p className="text-sm text-text-secondary">Route data will appear after a supplier is selected.</p>
        </div>
      )}
    </section>
  );
}
