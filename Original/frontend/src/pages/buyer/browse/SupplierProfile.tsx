import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { request } from '@/services/api/client';

interface Supplier { id: number; business_name: string; warehouse_address: string; service_radius_km: number; reliability_score: number; }
interface CatalogItem { id: number; part_name: string; part_number: string; brand: string; unit_price: number; quantity_in_stock: number; lead_time_hours: number; }

export function BrowseSupplierProfile() {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, c] = await Promise.all([
          request<Supplier>(`/api/suppliers/${supplierId}`),
          request<CatalogItem[]>(`/api/suppliers/${supplierId}/catalog`),
        ]);
        setSupplier(s);
        setCatalog(c);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    load();
  }, [supplierId]);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading supplier...</div>;
  if (!supplier) return <div className="text-center py-12 text-red-500">Supplier not found.</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">ÃƒÂ¢Ã¢â‚¬Â Ã‚Â Back</button>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold">{supplier.business_name[0]}</div>
        <div>
          <h1 className="text-3xl font-bold">{supplier.business_name}</h1>
          <p className="text-sm text-gray-400">{supplier.warehouse_address}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 uppercase">Reliability</div>
          <div className={`text-3xl font-bold ${supplier.reliability_score >= 0.8 ? 'text-green-600' : 'text-yellow-600'}`}>{(supplier.reliability_score * 100).toFixed(0)}%</div>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 uppercase">Radius</div>
          <div className="text-3xl font-bold">{supplier.service_radius_km} km</div>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs text-gray-400 uppercase">Parts</div>
          <div className="text-3xl font-bold">{catalog.length}</div>
        </div>
      </div>

      {catalog.length > 0 && (
        <div className="overflow-x-auto rounded-lg border ">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Part</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-transparent">
              {catalog.map(item => (
                <tr key={item.id} className=" cursor-pointer" onClick={() => navigate(`/buyer/parts/${item.id}`)}>
                  <td className="px-6 py-4 text-sm font-medium">{item.part_name} <span className="text-gray-400">({item.part_number})</span></td>
                  <td className="px-6 py-4 text-sm">ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹{item.unit_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">{item.quantity_in_stock}</td>
                  <td className="px-6 py-4 text-sm">{item.lead_time_hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
