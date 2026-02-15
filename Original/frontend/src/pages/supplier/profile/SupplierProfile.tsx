import { useEffect, useState } from 'react';
import { request } from '@/services/api/client';

interface Profile {
  id: number;
  email: string;
  role: string;
  supplier_profile?: { business_name: string; warehouse_address: string; gst_number: string; service_radius_km: number; reliability_score: number; pick_time_minutes: number };
}

export function SupplierProfile() {
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

  const sp = profile.supplier_profile;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
          {(sp?.business_name ?? profile.email)[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{sp?.business_name ?? profile.email}</h2>
          <p className="text-sm text-gray-500">{profile.email}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-lg font-semibold mb-4">Account</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div><dt className="text-xs text-gray-500 uppercase">Email</dt><dd className="font-medium">{profile.email}</dd></div>
          <div><dt className="text-xs text-gray-500 uppercase">Role</dt><dd className="font-medium capitalize">{profile.role}</dd></div>
        </dl>
      </div>

      {sp && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="text-lg font-semibold mb-4">Business Details</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-gray-500 uppercase">Business Name</dt><dd className="font-medium">{sp.business_name}</dd></div>
            <div><dt className="text-xs text-gray-500 uppercase">GST Number</dt><dd className="font-medium">{sp.gst_number || '—'}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-gray-500 uppercase">Warehouse</dt><dd className="font-medium">{sp.warehouse_address}</dd></div>
            <div><dt className="text-xs text-gray-500 uppercase">Service Radius</dt><dd className="font-medium">{sp.service_radius_km} km</dd></div>
            <div>
              <dt className="text-xs text-gray-500 uppercase">Reliability</dt>
              <dd className={`font-bold text-lg ${sp.reliability_score >= 0.8 ? 'text-green-600' : sp.reliability_score >= 0.5 ? 'text-yellow-600' : 'text-red-600'}`}>{(sp.reliability_score * 100).toFixed(0)}%</dd>
            </div>
            <div><dt className="text-xs text-gray-500 uppercase">Pick Time</dt><dd className="font-medium">{sp.pick_time_minutes ?? '—'} min</dd></div>
          </dl>
        </div>
      )}
    </div>
  );
}
