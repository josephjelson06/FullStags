import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { request } from '@/services/api/client';

interface Part { id: number; part_name: string; part_number: string; brand: string; unit_price: number; quantity_in_stock: number; lead_time_hours: number; supplier_name?: string; }

export function PartDetail() {
  const { partId } = useParams();
  const navigate = useNavigate();
  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { const data = await request<Part>(`/api/inventory/catalog/${partId}`); setPart(data); }
      catch { setPart(null); }
      finally { setLoading(false); }
    };
    load();
  }, [partId]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading part...</div>;
  if (!part) return <div className="text-center py-12 text-red-500">Part not found.</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">← Back</button>
      <div>
        <h1 className="text-2xl font-bold">{part.part_name}</h1>
        <p className="text-sm text-gray-500 mt-1">Part #{part.part_number}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Price</div>
          <div className="text-2xl font-bold mt-1">₹{part.unit_price.toFixed(2)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">In Stock</div>
          <div className={`text-2xl font-bold mt-1 ${part.quantity_in_stock <= 5 ? 'text-red-600' : 'text-green-600'}`}>{part.quantity_in_stock}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Lead Time</div>
          <div className="text-2xl font-bold mt-1">{part.lead_time_hours}h</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Brand</div>
          <div className="text-2xl font-bold mt-1">{part.brand || '—'}</div>
        </div>
      </div>

      <button className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700" onClick={() => navigate('/buyer/cart')}>
        Add to Order
      </button>
    </div>
  );
}
