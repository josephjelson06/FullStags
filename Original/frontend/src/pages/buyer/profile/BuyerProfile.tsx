import { useEffect, useState } from 'react';
import { me } from '@/services/api/auth';
import type { UserProfileDto } from '@/services/api/contracts';

export function BuyerProfile() {
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
          style={{ background: 'var(--gradient-primary)', boxShadow: '0 0 20px rgba(255,107,0,0.3)' }}
        >
          {profile.email[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {profile.factory_name || profile.email}
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{profile.email}</p>
        </div>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Account Information</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Email</dt>
            <dd className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{profile.email}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Role</dt>
            <dd className="mt-1 font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>{profile.role}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Joined</dt>
            <dd className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {new Date(profile.created_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h3 className="mb-4 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Business Details</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Factory Name</dt>
            <dd className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{profile.factory_name || '-'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Industry</dt>
            <dd className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{profile.industry_type || '-'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Delivery Address</dt>
            <dd className="mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>{profile.delivery_address || '-'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Coordinates</dt>
            <dd className="mt-1 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {profile.latitude != null && profile.longitude != null
                ? `${profile.latitude.toFixed(4)}, ${profile.longitude.toFixed(4)}`
                : '-'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
