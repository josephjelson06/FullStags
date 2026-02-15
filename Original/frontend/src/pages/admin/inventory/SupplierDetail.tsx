import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSupplierCatalog, type SupplierProfile } from '@/services/api/suppliers';
import { request } from '@/services/api/client';

interface CatalogItem { id: number; part_name: string; part_number: string; brand: string; unit_price: number; quantity_in_stock: number; lead_time_hours: number; }

export { SupplierDetail as AdminSupplierDetail };

export function SupplierDetail() {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, catalogResp] = await Promise.all([
          request<SupplierProfile>(`/api/suppliers/${supplierId}`),
          getSupplierCatalog(Number(supplierId)),
        ]);
        setProfile(p);
        setCatalog(catalogResp.items as CatalogItem[]);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    load();
  }, [supplierId]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading supplier...</div>;
  if (!profile) return <div className="text-center py-12 text-red-500">Supplier not found.</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/suppliers')} className="text-sm text-blue-600 hover:underline">← Back to Suppliers</button>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold">
          {profile.business_name[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.business_name}</h1>
          <p className="text-sm text-gray-500">{profile.warehouse_address}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Reliability</div>
          <div className={`text-2xl font-bold ${profile.reliability_score >= 0.8 ? 'text-green-600' : profile.reliability_score >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>
            {(profile.reliability_score * 100).toFixed(0)}%
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Service Radius</div>
          <div className="text-2xl font-bold">{profile.service_radius_km} km</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Catalog Items</div>
          <div className="text-2xl font-bold">{catalog.length}</div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Parts Catalog</h2>
        </div>
        {catalog.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">No catalog items.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Part</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Part #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Lead Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {catalog.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm font-medium">{item.part_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{item.part_number}</td>
                  <td className="px-6 py-4 text-sm">{item.brand || '—'}</td>
                  <td className="px-6 py-4 text-sm">₹{item.unit_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={item.quantity_in_stock <= 5 ? 'text-red-600 font-medium' : ''}>{item.quantity_in_stock}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{item.lead_time_hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
