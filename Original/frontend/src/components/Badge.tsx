import type { OrderStatus, Urgency, UserRole } from '@/types';

type BadgeVariant = Urgency | OrderStatus | UserRole | 'fastest';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

const colorMap: Record<BadgeVariant, { bg: string; text: string; border: string; dot?: string }> = {
  critical:              { bg: 'bg-critical-bg',              text: 'text-critical',              border: 'border-critical/20',              dot: 'bg-critical' },
  high:                  { bg: 'bg-high-bg',                  text: 'text-high',                  border: 'border-high/20',                  dot: 'bg-high' },
  standard:              { bg: 'bg-standard-bg',              text: 'text-standard',              border: 'border-standard/20' },
  matching:              { bg: 'bg-matching-bg',              text: 'text-matching',              border: 'border-matching/20',              dot: 'bg-matching' },
  pending_acceptance:    { bg: 'bg-pending-acceptance-bg',    text: 'text-pending-acceptance',    border: 'border-pending-acceptance/20',    dot: 'bg-pending-acceptance' },
  picking:               { bg: 'bg-picking-bg',               text: 'text-picking',               border: 'border-picking/20',               dot: 'bg-picking' },
  courier_to_supplier:   { bg: 'bg-courier-to-supplier-bg',   text: 'text-courier-to-supplier',   border: 'border-courier-to-supplier/20',   dot: 'bg-courier-to-supplier' },
  courier_to_factory:    { bg: 'bg-courier-to-factory-bg',    text: 'text-courier-to-factory',    border: 'border-courier-to-factory/20',    dot: 'bg-courier-to-factory' },
  delivered:             { bg: 'bg-delivered-bg',              text: 'text-delivered',              border: 'border-delivered/20' },
  fastest:               { bg: 'bg-delivered-bg',              text: 'text-delivered',              border: 'border-delivered/20' },
  buyer:                 { bg: 'bg-role-buyer-bg',             text: 'text-role-buyer',             border: 'border-role-buyer/20' },
  supplier:              { bg: 'bg-role-supplier-bg',          text: 'text-role-supplier',          border: 'border-role-supplier/20' },
  admin:                 { bg: 'bg-role-admin-bg',             text: 'text-role-admin',             border: 'border-role-admin/20' },
};

const ACTIVE_STATUSES = new Set<string>(['matching', 'pending_acceptance', 'picking', 'courier_to_supplier', 'courier_to_factory']);

function prettyLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

export function Badge({ variant, label, size = 'md', pulse }: BadgeProps) {
  const colors = colorMap[variant];
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const shouldPulse = pulse ?? ACTIVE_STATUSES.has(variant);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold capitalize ${sizeClass} ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {shouldPulse && colors.dot ? (
        <span className={`inline-block h-1.5 w-1.5 rounded-full animate-pulse-dot ${colors.dot}`} />
      ) : null}
      {label ?? prettyLabel(variant)}
    </span>
  );
}
