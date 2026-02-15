import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { request } from '@/services/api/client';

interface UserProfile {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  buyer_profile?: { factory_name: string; industry_type: string; delivery_address: string; latitude: number; longitude: number };
  supplier_profile?: { business_name: string; warehouse_address: string; gst_number: string; service_radius_km: number; reliability_score: number };
}

export function UserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await request<UserProfile>(`/api/users/${userId}`);
        setUser(data);
      } catch { setUser(null); }
      finally { setLoading(false); }
    };
    load();
  }, [userId]);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading user...</div>;
  if (!user) return <div className="text-center py-12 text-red-500">User not found.</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/users')} className="text-sm text-blue-600 hover:underline">â† Back to Users</button>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
          {user.email[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{user.email}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'buyer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{user.role}</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Account Details</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div><dt className="text-xs text-gray-400 uppercase">Email</dt><dd className="font-medium">{user.email}</dd></div>
          <div><dt className="text-xs text-gray-400 uppercase">Role</dt><dd className="font-medium capitalize">{user.role}</dd></div>
          <div><dt className="text-xs text-gray-400 uppercase">Status</dt><dd className="font-medium">{user.is_active ? 'Active' : 'Inactive'}</dd></div>
          <div><dt className="text-xs text-gray-400 uppercase">Joined</dt><dd className="font-medium">{new Date(user.created_at).toLocaleDateString()}</dd></div>
        </dl>
      </div>

      {user.buyer_profile && (
        <div className="surface-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Buyer Profile</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-gray-400 uppercase">Factory</dt><dd className="font-medium">{user.buyer_profile.factory_name}</dd></div>
            <div><dt className="text-xs text-gray-400 uppercase">Industry</dt><dd className="font-medium">{user.buyer_profile.industry_type}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-gray-400 uppercase">Delivery Address</dt><dd className="font-medium">{user.buyer_profile.delivery_address}</dd></div>
          </dl>
        </div>
      )}

      {user.supplier_profile && (
        <div className="surface-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Supplier Profile</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-gray-400 uppercase">Business</dt><dd className="font-medium">{user.supplier_profile.business_name}</dd></div>
            <div><dt className="text-xs text-gray-400 uppercase">GST</dt><dd className="font-medium">{user.supplier_profile.gst_number || 'â€”'}</dd></div>
            <div><dt className="text-xs text-gray-400 uppercase">Warehouse</dt><dd className="font-medium">{user.supplier_profile.warehouse_address}</dd></div>
            <div><dt className="text-xs text-gray-400 uppercase">Service Radius</dt><dd className="font-medium">{user.supplier_profile.service_radius_km} km</dd></div>
            <div><dt className="text-xs text-gray-400 uppercase">Reliability</dt><dd className="font-medium">{(user.supplier_profile.reliability_score * 100).toFixed(0)}%</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
