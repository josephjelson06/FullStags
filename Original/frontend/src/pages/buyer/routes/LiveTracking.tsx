import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder, getRoute } from '@/services/api/orders';

interface Stop { id: number; address: string; latitude: number; longitude: number; sequence_order: number; status: string; }
interface RouteInfo { delivery_id: number; status: string; optimized_distance_km: number; total_duration_minutes: number; stops: Stop[]; }
interface Order { id: number; status: string; urgency: string; }

export function LiveTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [o, r] = await Promise.all([
          getOrder(orderId!),
          getRoute(orderId!).catch(() => null),
        ]);
        setOrder(o as unknown as Order);
        setRoute(r as unknown as RouteInfo);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    load();
  }, [orderId]);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading tracking info...</div>;
  if (!order) return <div className="text-center py-12 text-red-500">Order not found.</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/buyer/orders')} className="text-sm text-blue-600 hover:underline">ÃƒÂ¢Ã¢â‚¬Â Ã‚Â Back to Orders</button>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tracking Order #{orderId}</h1>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
          order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
          order.status === 'IN_DELIVERY' ? 'bg-blue-100 text-blue-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>{order.status}</span>
      </div>

      {!route ? (
        <div className="rounded-lg border surface-card p-8 text-center">
          <div className="text-4xl mb-3">ÃƒÂ°Ã…Â¸Ã¢â‚¬Å“Ã‚Â¦</div>
          <p className="text-gray-400">No delivery route assigned yet.</p>
          <p className="text-sm text-gray-400 mt-1">A route will appear once this order enters delivery.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="surface-card rounded-2xl p-4">
              <div className="text-xs text-gray-400 uppercase">Delivery Status</div>
              <div className="text-lg font-bold mt-1">{route.status}</div>
            </div>
            <div className="surface-card rounded-2xl p-4">
              <div className="text-xs text-gray-400 uppercase">Distance</div>
              <div className="text-lg font-bold mt-1">{route.optimized_distance_km?.toFixed(1)} km</div>
            </div>
            <div className="surface-card rounded-2xl p-4">
              <div className="text-xs text-gray-400 uppercase">Est. Duration</div>
              <div className="text-lg font-bold mt-1">{route.total_duration_minutes?.toFixed(0)} min</div>
            </div>
          </div>

          <div className="surface-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Route Stops</h2>
            <div className="space-y-0">
              {(route.stops ?? []).sort((a, b) => a.sequence_order - b.sequence_order).map((stop, i, arr) => (
                <div key={stop.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-4 w-4 rounded-full border-2 ${stop.status === 'COMPLETED' ? 'bg-green-500 border-green-500' : stop.status === 'IN_PROGRESS' ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-gray-300'}`} />
                    {i < arr.length - 1 && <div className="w-0.5 h-8 bg-gray-200" />}
                  </div>
                  <div className="pb-6">
                    <div className="font-medium text-sm">Stop {stop.sequence_order + 1}</div>
                    <div className="text-sm text-gray-400">{stop.address}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
