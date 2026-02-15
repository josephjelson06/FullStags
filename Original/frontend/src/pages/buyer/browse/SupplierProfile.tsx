import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSupplier, getSupplierCatalog, type SupplierSummary } from '@/services/api/suppliers';
import type { CatalogEntryDto } from '@/services/api/contracts';

export function BrowseSupplierProfile() {
  const { supplierId } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<SupplierSummary | null>(null);
  const [catalog, setCatalog] = useState<CatalogEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const [supplierRow, catalogResponse] = await Promise.all([
          getSupplier(Number(supplierId)),
          getSupplierCatalog(Number(supplierId), 1, 100),
        ]);
        setSupplier(supplierRow);
        setCatalog(catalogResponse.items);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [supplierId]);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading supplier...</div>;
  if (!supplier) return <div className="py-12 text-center text-red-500">Supplier not found.</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">Back</button>
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-teal-600 text-xl font-bold text-white">
          {supplier.business_name[0]}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{supplier.business_name}</h1>
          <p className="text-sm text-gray-400">{supplier.warehouse_address}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs uppercase text-gray-400">Reliability</div>
          <div className={`text-3xl font-bold ${supplier.reliability_score >= 0.8 ? 'text-green-600' : 'text-yellow-600'}`}>
            {(supplier.reliability_score * 100).toFixed(0)}%
          </div>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs uppercase text-gray-400">Radius</div>
          <div className="text-3xl font-bold">{supplier.service_radius_km} km</div>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs uppercase text-gray-400">Parts</div>
          <div className="text-3xl font-bold">{catalog.length}</div>
        </div>
      </div>

      {catalog.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
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
              {catalog.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm font-medium">
                    {item.part_name} <span className="text-gray-400">({item.part_number})</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{item.unit_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">{item.quantity_in_stock}</td>
                  <td className="px-6 py-4 text-sm">{item.lead_time_hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
