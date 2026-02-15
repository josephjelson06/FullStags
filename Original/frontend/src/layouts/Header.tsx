import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/Badge';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <header
      className="glass sticky top-0 z-10 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 transition-colors duration-300 md:px-8"
      style={{
        borderColor: 'var(--color-border)',
        background: 'color-mix(in srgb, var(--color-bg) 80%, transparent)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded text-sm font-bold"
          style={{
            background: 'var(--color-primary)',
            color: '#ffffff',
            boxShadow: '0 0 15px rgba(255, 107, 0, 0.4)',
          }}
        >
          UP
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary leading-none">UrgentParts</p>
          <p className="mt-1 hidden text-[10px] font-medium uppercase tracking-tight text-text-muted md:block">
            When the line stops, we start.
          </p>
        </div>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-6">
        {user ? (
          <>
            <div className="hidden text-right md:block">
              <p className="text-xs font-bold leading-tight text-text-primary">{user.name}</p>
              <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
                {user.companyName}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-black"
                style={{
                  background: 'var(--color-surface-inset)',
                  color: 'var(--color-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {initials}
              </div>

              <Badge variant={user.role} size="sm" />
            </div>
          </>
        ) : null}

        <button
          type="button"
          onClick={onLogout}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-all hover:text-danger"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
