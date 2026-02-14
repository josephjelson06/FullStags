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
    <article className="hover-lift group rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-secondary">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">{value}</p>
          {trendText ? (
            <p className={`mt-1 text-xs font-semibold ${trendColor}`}>{trendText}</p>
          ) : null}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
          style={{
            background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
            color: accentColor,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        className="mt-4 h-1 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--color-border-light)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: '60%',
            background: `linear-gradient(90deg, ${accentColor}, color-mix(in srgb, ${accentColor} 60%, transparent))`,
          }}
        />
      </div>
    </article>
  );
}
