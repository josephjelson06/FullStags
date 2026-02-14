import { Activity, Gauge, PackageSearch, Timer, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/Badge';
import { DataTable, type DataColumn } from '@/components/DataTable';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { useDashboard } from '@/hooks/useDashboard';
import { useOrders } from '@/hooks/useOrders';
import type { Order } from '@/types';
import { getOrderDetailPath } from '@/utils/routes';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { metrics, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useDashboard();
  const { orders, loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useOrders('all');

  const columns: DataColumn<Order>[] = [
    {
      header: 'Order',
      render: (row) => (
        <button
          type="button"
          onClick={() => navigate(getOrderDetailPath('admin', row.orderId))}
          className="font-semibold transition-colors hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          {row.orderId}
        </button>
      ),
    },
    {
      header: 'Part',
      render: (row) => <span className="font-medium">{row.partName}</span>,
    },
    {
      header: 'Buyer',
      render: (row) => <span className="text-text-secondary">{row.buyerCompany ?? row.buyer?.companyName ?? '--'}</span>,
    },
    {
      header: 'Supplier',
      render: (row) => <span className="text-text-secondary">{row.supplierName ?? '--'}</span>,
    },
    {
      header: 'Status',
      render: (row) => <Badge variant={row.status} />,
    },
    {
      header: 'ETA',
      render: (row) => <span className="font-semibold">{row.etaMinutesRemaining ?? 0} min</span>,
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Track platform KPIs and monitor all emergency orders in one stream."
      />

      {metricsError ? <ErrorBanner message={metricsError} onRetry={() => void refetchMetrics()} /> : null}
      {ordersError ? <ErrorBanner message={ordersError} onRetry={() => void refetchOrders()} /> : null}

      {/* Metrics */}
      {metrics ? (
        <div className="stagger-children grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Orders Today"
            value={String(metrics.totalOrdersToday)}
            icon={<PackageSearch size={20} />}
            accent="var(--color-primary)"
          />
          <StatCard
            label="Avg Match Time"
            value={`${metrics.averageMatchTimeSeconds}s`}
            icon={<Timer size={20} />}
            accent="var(--color-info)"
          />
          <StatCard
            label="Avg Delivery"
            value={`${metrics.averageDeliveryTimeMinutes} min`}
            icon={<Gauge size={20} />}
            accent="var(--color-warning)"
          />
          <StatCard
            label="Fulfillment"
            value={`${Math.round(metrics.fulfillmentRate * 100)}%`}
            icon={<TrendingUp size={20} />}
            accent="var(--color-success)"
          />
          <StatCard
            label="Downtime Saved"
            value={`$${metrics.totalDowntimeSavedDollars.toLocaleString()}`}
            icon={<Activity size={20} />}
            accent="var(--color-role-admin)"
          />
        </div>
      ) : metricsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-shimmer h-28 rounded-2xl" />
          ))}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={orders}
        rowKey={(row) => row.orderId}
        loading={ordersLoading}
        emptyTitle="No orders available"
        emptyDescription="Orders across buyer and supplier flows will appear here."
      />
    </section>
  );
}
