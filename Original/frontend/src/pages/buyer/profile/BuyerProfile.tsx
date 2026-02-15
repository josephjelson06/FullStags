import { useEffect, useState } from 'react';
import { request } from '@/services/api/client';

interface Profile {
  id: number;
  email: string;
  role: string;
  buyer_profile?: { factory_name: string; industry_type: string; delivery_address: string; latitude: number; longitude: number };
}

export function BuyerProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { const data = await request<Profile>('/api/auth/me'); setProfile(data); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading profile...</div>;
  if (!profile) return <div className="text-center py-12 text-red-500">Failed to load profile.</div>;

  const bp = profile.buyer_profile;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
          {profile.email[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{bp?.factory_name || profile.email}</h2>
          <p className="text-sm text-gray-500">{profile.email}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-semibold mb-4">Account Information</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div><dt className="text-xs text-gray-500 uppercase">Email</dt><dd className="font-medium">{profile.email}</dd></div>
          <div><dt className="text-xs text-gray-500 uppercase">Role</dt><dd className="font-medium capitalize">{profile.role}</dd></div>
        </dl>
      </div>

      {bp && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-semibold mb-4">Business Details</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-gray-500 uppercase">Factory Name</dt><dd className="font-medium">{bp.factory_name}</dd></div>
            <div><dt className="text-xs text-gray-500 uppercase">Industry</dt><dd className="font-medium">{bp.industry_type || '—'}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-gray-500 uppercase">Delivery Address</dt><dd className="font-medium">{bp.delivery_address || '—'}</dd></div>
            <div><dt className="text-xs text-gray-500 uppercase">Coordinates</dt><dd className="font-medium text-sm">{bp.latitude.toFixed(4)}, {bp.longitude.toFixed(4)}</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
