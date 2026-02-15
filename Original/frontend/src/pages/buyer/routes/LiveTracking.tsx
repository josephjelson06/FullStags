import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/Badge';
import { RouteMap } from '@/components/RouteMap';
import { getOrder, getRoute } from '@/services/api/orders';
import type { Order, RouteData } from '@/types';

export function LiveTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [orderRow, routeRow] = await Promise.all([
          getOrder(orderId),
          getRoute(orderId).catch(() => null),
        ]);
        setOrder(orderRow);
        setRoute(routeRow);
      } catch {
        setOrder(null);
        setRoute(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [orderId]);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading tracking info...</div>;
  if (!order) return <div className="py-12 text-center text-red-500">Order not found.</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/buyer/orders')} className="text-sm text-blue-600 hover:underline">
        Back to Orders
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tracking Order #{orderId}</h1>
        <Badge variant={order.status} />
      </div>

      {route ? (
        <RouteMap
          supplierLocation={route.supplierLocation}
          factoryLocation={route.factoryLocation}
          courierLocation={route.courierCurrentLocation}
          legs={route.legs}
          etaMinutesRemaining={route.etaMinutesRemaining}
        />
      ) : (
        <div className="surface-card rounded-lg border p-8 text-center">
          <p className="text-gray-400">No delivery route assigned yet.</p>
          <p className="mt-1 text-sm text-gray-400">Route data appears after matching, confirmation, and delivery planning.</p>
        </div>
      )}
    </div>
  );
}
