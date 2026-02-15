import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  trend?: number;
  accent?: string;
}

export function StatCard({ label, value, icon, trend, accent }: StatCardProps) {
  const trendColor = trend && trend >= 0 ? 'text-delivered' : 'text-critical';
  const trendText = trend ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)}%` : null;
  const accentColor = accent ?? 'var(--color-primary)';

  return (
    <article
      className="hover-lift group surface-card rounded-xl p-6 transition-all"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
          style={{
            background: 'var(--color-surface-inset)',
            color: accentColor,
          }}
        >
          {icon}
        </div>
        {trendText ? (
          <span
            className={`rounded-full px-2 py-1 text-xs font-bold ${trendColor}`}
            style={{
              background:
                trend && trend >= 0
                  ? 'var(--color-success-bg)'
                  : 'var(--color-danger-bg)',
            }}
          >
            {trendText}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
    </article>
  );
}
