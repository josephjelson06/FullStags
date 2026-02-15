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

  if (loading) return <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>Loading profile...</div>;
  if (!profile) return <div className="text-center py-12 text-red-500">Failed to load profile.</div>;

  const sp = profile.supplier_profile;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>My Profile</h1>

      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center text-white text-3xl font-bold"
          style={{ background: 'linear-gradient(135deg, var(--color-success), #15803d)', boxShadow: '0 0 20px rgba(22,163,74,0.3)' }}
        >
          {(sp?.business_name ?? profile.email)[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{sp?.business_name ?? profile.email}</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{profile.email}</p>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Account</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Email</dt>
            <dd className="font-medium mt-1" style={{ color: 'var(--color-text-primary)' }}>{profile.email}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Role</dt>
            <dd className="font-medium mt-1 capitalize" style={{ color: 'var(--color-text-primary)' }}>{profile.role}</dd>
          </div>
        </dl>
      </div>

      {sp && (
        <div className="surface-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Business Details</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Business Name</dt>
              <dd className="font-medium mt-1" style={{ color: 'var(--color-text-primary)' }}>{sp.business_name}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>GST Number</dt>
              <dd className="font-medium mt-1" style={{ color: 'var(--color-text-primary)' }}>{sp.gst_number || 'â€”'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Warehouse</dt>
              <dd className="font-medium mt-1" style={{ color: 'var(--color-text-primary)' }}>{sp.warehouse_address}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Service Radius</dt>
              <dd className="font-medium mt-1" style={{ color: 'var(--color-text-primary)' }}>{sp.service_radius_km} km</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Reliability</dt>
              <dd
                className="font-bold text-lg mt-1"
                style={{ color: sp.reliability_score >= 0.8 ? 'var(--color-success)' : sp.reliability_score >= 0.5 ? 'var(--color-warning)' : 'var(--color-danger)' }}
              >
                {(sp.reliability_score * 100).toFixed(0)}%
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Pick Time</dt>
              <dd className="font-medium mt-1" style={{ color: 'var(--color-text-primary)' }}>{sp.pick_time_minutes ?? 'â€”'} min</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
