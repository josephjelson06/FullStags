import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { getRoleHomePath } from '@/utils/routes';

const DEMO_ACCOUNTS = [
  { role: 'Buyer', email: 'buyer.mumbai@sparehub.in', password: 'buyer123', color: 'var(--color-role-buyer)' },
  { role: 'Supplier', email: 'supplier.thane@sparehub.in', password: 'supplier123', color: 'var(--color-role-supplier)' },
  { role: 'Admin', email: 'admin@sparehub.in', password: 'admin123', color: 'var(--color-role-admin)' },
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useAuth();

  const [email, setEmail] = useState('buyer.mumbai@sparehub.in');
  const [password, setPassword] = useState('buyer123');
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
    <main className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Left: Feature Panel */}
      <div
        className="hidden w-1/2 flex-col justify-center p-20 relative overflow-hidden md:flex"
        style={{ background: 'var(--color-surface-elevated)' }}
      >
        <div
          className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full pointer-events-none"
          style={{ background: 'rgba(255, 107, 0, 0.1)', filter: 'blur(120px)' }}
        />

        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-12">
            <div
              className="flex h-10 w-10 items-center justify-center rounded font-bold text-white"
              style={{
                background: 'var(--color-primary)',
                boxShadow: '0 0 20px rgba(255, 107, 0, 0.6)',
              }}
            >
              UP
            </div>
            <span className="text-3xl font-bold tracking-tighter text-text-primary">
              URGENT<span style={{ color: 'var(--color-primary)' }}>PARTS</span>
            </span>
          </div>

          <h2 className="text-5xl font-bold leading-tight mb-6 text-text-primary">
            When the line stops,<br />
            <span style={{ color: 'var(--color-primary)' }}>we start.</span>
          </h2>
          <p className="text-xl leading-relaxed mb-12 text-text-secondary">
            Proprietary matching engine connecting mission-critical factories with the
            nearest available precision parts in real-time.
          </p>

          <div className="space-y-6">
            {[
              { icon: '⚡', text: 'Real-time supplier matching & dynamic weight routing' },
              { icon: '🛡️', text: 'Full chain of custody & mission-critical verification' },
              { icon: '📈', text: '₹2,00,000/hr downtime saved per deployment' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-4 group">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg transition-transform group-hover:scale-110"
                  style={{ background: 'var(--color-primary-light)' }}
                >
                  {item.icon}
                </div>
                <span className="text-lg font-medium text-text-secondary">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div
        className="flex w-full flex-col items-center justify-center p-8 md:w-1/2"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">System Login</h1>
            <p className="text-text-muted">Access your command center and dispatch parts.</p>
          </div>

          <form className="space-y-6" onSubmit={onSubmit}>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-text-muted"
                htmlFor="login-email"
              >
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commander@factory.com"
                required
              />
            </div>
            <div>
              <label
                className="mb-2 block text-sm font-medium text-text-muted"
                htmlFor="login-password"
              >
                Access Token
              </label>
              <input
                id="login-password"
                type="password"
                className="w-full rounded-lg px-4 py-3 text-sm font-medium transition-all"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error ? (
              <p
                className="rounded-lg px-3 py-2 text-sm font-medium"
                style={{
                  background: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                }}
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: 'var(--color-primary)',
                boxShadow: '0 0 15px rgba(255, 107, 0, 0.4)',
              }}
            >
              {submitting ? 'Authorizing...' : 'Authorize Access →'}
            </button>
          </form>

          {/* Demo Quick Login */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid var(--color-border)' }} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span
                className="px-2 text-text-muted"
                style={{ background: 'var(--color-bg)' }}
              >
                DEMO QUICK LOGIN
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => fillCredentials(account.email, account.password)}
                className="surface-card rounded-lg p-3 text-xs font-bold transition-all hover:bg-surface-hover"
                style={{ color: account.color }}
              >
                {account.role.toUpperCase()}
              </button>
            ))}
          </div>

          <p className="mt-5 text-sm text-text-secondary">
            Need an account?{' '}
            <Link
              to="/signup"
              className="font-semibold hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
