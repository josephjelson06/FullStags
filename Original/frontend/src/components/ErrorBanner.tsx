import { AlertTriangle } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="animate-slide-down flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{
        borderColor: 'var(--color-danger)',
        borderLeftWidth: '3px',
        background: 'var(--color-danger-bg)',
      }}
    >
      <AlertTriangle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
      <p className="flex-1 text-sm font-medium" style={{ color: 'var(--color-danger)' }}>
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:shadow-sm"
          style={{
            color: 'var(--color-danger)',
            border: '1px solid var(--color-danger)',
            background: 'transparent',
          }}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
