interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'chart' | 'inline';
  rows?: number;
}

export function LoadingSkeleton({ variant = 'card', rows = 3 }: LoadingSkeletonProps) {
  if (variant === 'inline') {
    return <div className="animate-shimmer h-5 w-24 rounded-md" />;
  }

  if (variant === 'chart') {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="animate-shimmer mb-4 h-5 w-32 rounded-md" />
        <div className="animate-shimmer h-48 w-full rounded-xl" style={{ animationDelay: '100ms' }} />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
        <div className="animate-shimmer h-10 w-full rounded-lg" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={`skel-row-${i}`}
            className="animate-shimmer h-12 w-full rounded-lg"
            style={{ animationDelay: `${(i + 1) * 100}ms` }}
          />
        ))}
      </div>
    );
  }

  // Default: card
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={`skel-card-${i}`}
          className="animate-shimmer h-16 w-full rounded-xl"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
