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
      className="glass sticky top-0 z-10 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-6"
      style={{
        borderColor: 'var(--color-border)',
        background: 'color-mix(in srgb, var(--color-surface) 85%, transparent)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
          style={{
            background: 'var(--gradient-primary)',
            color: 'var(--color-text-on-primary)',
          }}
        >
          UP
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary md:text-base">UrgentParts</p>
          <p className="hidden text-[11px] text-text-muted md:block">When the line stops, we start.</p>
        </div>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <div className="hidden text-right text-xs md:block">
              <p className="font-semibold text-text-primary">{user.name}</p>
              <p className="text-text-muted">{user.companyName}</p>
            </div>

            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                outline: '2px solid var(--color-primary)',
                outlineOffset: '1px',
              }}
            >
              {initials}
            </div>

            <Badge variant={user.role} size="sm" />
          </>
        ) : null}

        <button
          type="button"
          onClick={onLogout}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
