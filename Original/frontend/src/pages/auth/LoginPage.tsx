import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { getRoleHomePath } from '@/utils/routes';

const DEMO_ACCOUNTS = [
  { role: 'Buyer', email: 'buyer@factory.com', password: 'password123', color: 'var(--color-role-buyer)' },
  { role: 'Supplier', email: 'supplier@parts.com', password: 'password123', color: 'var(--color-role-supplier)' },
  { role: 'Admin', email: 'admin@urgentparts.com', password: 'password123', color: 'var(--color-role-admin)' },
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();

  const [email, setEmail] = useState('buyer@factory.com');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const authenticatedUser = await login(email, password);
      navigate(getRoleHomePath(authenticatedUser.role), { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12"
          style={{ background: 'var(--color-bg)' }}>
      <div className="animate-scale-in flex w-full max-w-4xl overflow-hidden rounded-2xl shadow-xl"
           style={{
             border: '1px solid var(--color-border)',
             background: 'var(--color-surface)',
           }}>

        {/* Left: Branding Panel */}
        <div className="hidden w-[45%] flex-col justify-between p-10 md:flex"
             style={{
               background: 'var(--gradient-hero)',
               color: '#ffffff',
             }}>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em]"
                 style={{ opacity: 0.9 }}>
              <span className="animate-pulse-dot inline-block h-2 w-2 rounded-full bg-white" />
              UrgentParts
            </div>
            <h2 className="mt-8 text-3xl font-bold leading-tight">
              When the line stops,<br />we start.
            </h2>
            <p className="mt-4 text-sm leading-relaxed" style={{ opacity: 0.85 }}>
              Emergency industrial parts matching — connecting factories with the nearest
              available supplier in minutes, not hours.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: '⚡', text: 'Real-time supplier matching' },
              { icon: '📍', text: 'Optimized delivery routing' },
              { icon: '💰', text: '$25,000/hr downtime savings' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-sm" style={{ opacity: 0.85 }}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.15)' }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="flex w-full flex-col justify-center p-8 md:w-[55%] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] md:hidden"
             style={{ color: 'var(--color-primary)' }}>
            UrgentParts
          </p>
          <h1 className="mt-2 text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Sign in to your account
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Dispatch emergency parts in minutes.
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                className="w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error ? (
              <p className="rounded-lg px-3 py-2 text-sm font-medium"
                 style={{
                   background: 'var(--color-danger-bg)',
                   color: 'var(--color-danger)',
                 }}>
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: 'var(--gradient-primary)',
                color: 'var(--color-text-on-primary)',
              }}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 rounded-xl p-4"
               style={{
                 background: 'var(--color-surface-inset)',
                 border: '1px solid var(--color-border)',
               }}>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest"
               style={{ color: 'var(--color-text-muted)' }}>
              Quick Login — Demo Accounts
            </p>
            <div className="space-y-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => fillCredentials(account.email, account.password)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all hover:shadow-xs"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: account.color }} />
                  <span className="font-semibold">{account.role}</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {account.email}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Need an account?{' '}
            <Link to="/signup" className="font-semibold hover:underline"
                  style={{ color: 'var(--color-primary)' }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
