import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { request } from '@/services/api/client';
import type { UserProfileDto } from '@/services/api/contracts';

export function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const data = await request<UserProfileDto>(`/api/users/${userId}/profile`);
        setUser(data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId]);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading user...</div>;
  if (!user) return <div className="py-12 text-center text-red-500">User not found.</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/users')} className="text-sm text-blue-600 hover:underline">Back to Users</button>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-3xl font-bold text-white">
          {user.email[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{user.email}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'buyer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{user.role}</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold">Account Details</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div><dt className="text-xs uppercase text-gray-400">Email</dt><dd className="font-medium">{user.email}</dd></div>
          <div><dt className="text-xs uppercase text-gray-400">Role</dt><dd className="font-medium capitalize">{user.role}</dd></div>
          <div><dt className="text-xs uppercase text-gray-400">Status</dt><dd className="font-medium">{user.is_active ? 'Active' : 'Inactive'}</dd></div>
          <div><dt className="text-xs uppercase text-gray-400">Joined</dt><dd className="font-medium">{new Date(user.created_at).toLocaleDateString()}</dd></div>
        </dl>
      </div>

      {user.role === 'buyer' ? (
        <div className="surface-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Buyer Profile</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-xs uppercase text-gray-400">Factory</dt><dd className="font-medium">{user.factory_name || '-'}</dd></div>
            <div><dt className="text-xs uppercase text-gray-400">Industry</dt><dd className="font-medium">{user.industry_type || '-'}</dd></div>
            <div className="col-span-2"><dt className="text-xs uppercase text-gray-400">Delivery Address</dt><dd className="font-medium">{user.delivery_address || '-'}</dd></div>
          </dl>
        </div>
      ) : null}

      {user.role === 'supplier' ? (
        <div className="surface-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Supplier Profile</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-xs uppercase text-gray-400">Business</dt><dd className="font-medium">{user.business_name || '-'}</dd></div>
            <div><dt className="text-xs uppercase text-gray-400">GST</dt><dd className="font-medium">{user.gst_number || '-'}</dd></div>
            <div><dt className="text-xs uppercase text-gray-400">Warehouse</dt><dd className="font-medium">{user.warehouse_address || '-'}</dd></div>
            <div><dt className="text-xs uppercase text-gray-400">Service Radius</dt><dd className="font-medium">{user.service_radius_km != null ? `${user.service_radius_km} km` : '-'}</dd></div>
            <div><dt className="text-xs uppercase text-gray-400">Reliability</dt><dd className="font-medium">{user.reliability_score != null ? `${(user.reliability_score * 100).toFixed(0)}%` : '-'}</dd></div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
