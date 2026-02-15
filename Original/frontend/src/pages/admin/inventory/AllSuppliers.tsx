import { useEffect, useState } from 'react';
import { getSuppliers, type SupplierProfile } from '@/services/api/suppliers';
import { useNavigate } from 'react-router-dom';

export function AllSuppliers() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSuppliers();
        setSuppliers(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading suppliers...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Suppliers</h1>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Business</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Service Radius</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Reliability</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className="px-6 py-4 text-sm font-medium">{s.business_name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{s.warehouse_address}</td>
                <td className="px-6 py-4 text-sm">{s.service_radius_km} km</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`font-medium ${
                    s.reliability_score >= 0.8 ? 'text-green-600' :
                    s.reliability_score >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(s.reliability_score * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                    onClick={() => navigate(`/admin/suppliers/${s.id}`)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No suppliers registered.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
