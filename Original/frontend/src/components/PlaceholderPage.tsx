import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  module: string;
  /** Optional accent color for the module badge */
  moduleColor?: string;
}

const MODULE_COLORS: Record<string, string> = {
  'Auth / RBAC': 'var(--color-role-admin)',
  'Matching Engine': 'var(--color-info)',
  'Route Optimization': 'var(--color-courier-to-supplier)',
  'Supplier & Inventory': 'var(--color-role-supplier)',
  'Order Management': 'var(--color-primary)',
  'Notifications': 'var(--color-warning)',
  'Analytics': 'var(--color-courier-to-factory)',
};

export function PlaceholderPage({ title, description, module, moduleColor }: PlaceholderPageProps) {
  const color = moduleColor ?? MODULE_COLORS[module] ?? 'var(--color-primary)';

  return (
    <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center">
      <div
        className="mb-8 flex h-16 w-16 items-center justify-center rounded-xl border"
        style={{ background: 'var(--color-surface-inset)', borderColor: 'var(--color-border)', color }}
      >
        <Construction size={28} />
      </div>

      <span
        className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
        style={{
          background: `color-mix(in srgb, ${color} 10%, transparent)`,
          color,
          border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        }}
      >
        Module: {module}
      </span>

      <h1 className="text-3xl font-bold tracking-tight text-text-primary">{title}</h1>
      <p className="mt-2 max-w-xl text-base leading-relaxed text-text-secondary">{description}</p>

      <div
        className="mt-12 surface-card rounded-xl border-dashed px-10 py-4 text-sm italic"
        style={{
          color: 'var(--color-text-muted)',
        }}
      >
        This page is ready to be implemented. Replace this component with the real module.
      </div>
    </div>
  );
}
