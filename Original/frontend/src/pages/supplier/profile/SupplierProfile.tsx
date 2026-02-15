import { useEffect, useState } from 'react';
import { me } from '@/services/api/auth';
import type { UserProfileDto } from '@/services/api/contracts';

export function SupplierProfile() {
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await me();
        setProfile(data);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <div className="py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>Loading profile...</div>;
  if (!profile) return <div className="py-12 text-center text-red-500">Failed to load profile.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>My Profile</h1>

      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold text-white"
          style={{ background: 'linear-gradient(135deg, var(--color-success), #15803d)', boxShadow: '0 0 20px rgba(22,163,74,0.3)' }}
        >
          {(profile.business_name ?? profile.email)[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{profile.business_name ?? profile.email}</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{profile.email}</p>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Account</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Email</dt>
            <dd className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{profile.email}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Role</dt>
            <dd className="mt-1 font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>{profile.role}</dd>
          </div>
        </dl>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Business Details</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Business Name</dt>
            <dd className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{profile.business_name || '-'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>GST Number</dt>
            <dd className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{profile.gst_number || '-'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Warehouse</dt>
            <dd className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{profile.warehouse_address || '-'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Service Radius</dt>
            <dd className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {profile.service_radius_km != null ? `${profile.service_radius_km} km` : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Reliability</dt>
            <dd
              className="mt-1 text-lg font-bold"
              style={{
                color: (profile.reliability_score ?? 0) >= 0.8
                  ? 'var(--color-success)'
                  : (profile.reliability_score ?? 0) >= 0.5
                    ? 'var(--color-warning)'
                    : 'var(--color-danger)',
              }}
            >
              {profile.reliability_score != null ? `${(profile.reliability_score * 100).toFixed(0)}%` : '-'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
