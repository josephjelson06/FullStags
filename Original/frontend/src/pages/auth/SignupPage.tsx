import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
import { getRoleHomePath } from '@/utils/routes';

export function SignupPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<UserRole>('buyer');
  const [industryType, setIndustryType] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = useState('100');
  const [address, setAddress] = useState('1400 Industrial Blvd, Chicago, IL');
  const [lat, setLat] = useState('41.8781');
  const [lng, setLng] = useState('-87.6298');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const latitude = Number(lat);
    const longitude = Number(lng);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Latitude and longitude must be valid numbers');
      setSubmitting(false);
      return;
    }

    try {
      const registeredUser = await register({
        email,
        password,
        displayName: name,
        role: role === 'admin' ? 'buyer' : role,
        companyName,
        industryType: role === 'buyer' ? industryType : undefined,
        gstNumber: role === 'supplier' ? gstNumber : undefined,
        serviceRadiusKm: role === 'supplier' ? Number(serviceRadiusKm) : undefined,
        location: { lat: latitude, lng: longitude, address },
      });
      navigate(getRoleHomePath(registeredUser.role), { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12"
          style={{ background: 'var(--color-bg)' }}>
      <div className="animate-scale-in flex w-full max-w-4xl overflow-hidden rounded-2xl shadow-xl"
           style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>

        {/* Left: Branding Panel */}
        <div className="hidden w-[40%] flex-col justify-between p-10 md:flex"
             style={{ background: 'var(--gradient-hero)', color: '#ffffff' }}>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em]" style={{ opacity: 0.9 }}>
              <span className="animate-pulse-dot inline-block h-2 w-2 rounded-full bg-transparent" />
              UrgentParts
            </div>
            <h2 className="mt-8 text-3xl font-bold leading-tight">
              Join the network
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ opacity: 0.85 }}>
              Whether you need emergency parts sourced or you supply them Ã¢â‚¬â€ create your account to join the fastest industrial matching network.
            </p>
          </div>
        </div>

        {/* Right: Signup Form */}
        <div className="flex w-full flex-col justify-center p-8 md:w-[60%] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] md:hidden"
             style={{ color: 'var(--color-primary)' }}>UrgentParts</p>
          <h1 className="mt-2 text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Create your account
          </h1>

          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="signup-name">Full Name</label>
              <input id="signup-name" className="w-full" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="signup-company">Company Name</label>
              <input id="signup-company" className="w-full" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="signup-email">Email</label>
              <input id="signup-email" type="email" className="w-full" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="signup-password">Password</label>
              <input id="signup-password" type="password" className="w-full" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="signup-role">Role</label>
              <select id="signup-role" className="w-full" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                <option value="buyer">Buyer</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
            {role === 'buyer' ? (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="signup-industry">Industry Type</label>
                <input id="signup-industry" className="w-full" value={industryType} onChange={(e) => setIndustryType(e.target.value)} />
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="signup-gst">GST Number</label>
                  <input id="signup-gst" className="w-full" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="signup-radius">Service Radius (km)</label>
                  <input id="signup-radius" type="number" min="1" className="w-full" value={serviceRadiusKm} onChange={(e) => setServiceRadiusKm(e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="signup-address">Address</label>
              <input id="signup-address" className="w-full" value={address} onChange={(e) => setAddress(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="signup-lat">Latitude</label>
              <input id="signup-lat" type="number" step="any" className="w-full" value={lat} onChange={(e) => setLat(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="signup-lng">Longitude</label>
              <input id="signup-lng" type="number" step="any" className="w-full" value={lng} onChange={(e) => setLng(e.target.value)} required />
            </div>

            {error ? (
              <p className="rounded-lg px-3 py-2 text-sm font-medium md:col-span-2"
                 style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
              style={{ background: 'var(--gradient-primary)', color: 'var(--color-text-on-primary)' }}
            >
              {submitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:underline"
                  style={{ color: 'var(--color-primary)' }}>Login</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
