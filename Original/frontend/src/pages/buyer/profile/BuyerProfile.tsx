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

  if (loading) return <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>Loading profile...</div>;
  if (!profile) return <div className="text-center py-12 text-red-500">Failed to load profile.</div>;

  const bp = profile.buyer_profile;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>My Profile</h1>

      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center text-white text-3xl font-bold"
          style={{ background: 'var(--gradient-primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
        >
          {profile.email[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{bp?.factory_name || profile.email}</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{profile.email}</p>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Account Information</h3>
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

      {bp && (
        <div className="surface-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Business Details</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Factory Name</dt>
              <dd className="font-medium mt-1" style={{ color: 'var(--color-text-primary)' }}>{bp.factory_name}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Industry</dt>
              <dd className="font-medium mt-1" style={{ color: 'var(--color-text-primary)' }}>{bp.industry_type || 'â€”'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Delivery Address</dt>
              <dd className="font-medium mt-1" style={{ color: 'var(--color-text-primary)' }}>{bp.delivery_address || 'â€”'}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Coordinates</dt>
              <dd className="font-medium mt-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>{bp.latitude.toFixed(4)}, {bp.longitude.toFixed(4)}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
