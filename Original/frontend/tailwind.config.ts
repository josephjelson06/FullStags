import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-light': 'var(--color-primary-light)',

        critical: 'var(--color-critical)',
        'critical-bg': 'var(--color-critical-bg)',
        high: 'var(--color-high)',
        'high-bg': 'var(--color-high-bg)',
        standard: 'var(--color-standard)',
        'standard-bg': 'var(--color-standard-bg)',

        matching: 'var(--color-matching)',
        'matching-bg': 'var(--color-matching-bg)',
        'pending-acceptance': 'var(--color-pending-acceptance)',
        'pending-acceptance-bg': 'var(--color-pending-acceptance-bg)',
        picking: 'var(--color-picking)',
        'picking-bg': 'var(--color-picking-bg)',
        'courier-to-supplier': 'var(--color-courier-to-supplier)',
        'courier-to-supplier-bg': 'var(--color-courier-to-supplier-bg)',
        'courier-to-factory': 'var(--color-courier-to-factory)',
        'courier-to-factory-bg': 'var(--color-courier-to-factory-bg)',
        delivered: 'var(--color-delivered)',
        'delivered-bg': 'var(--color-delivered-bg)',

        success: 'var(--color-success)',
        'success-bg': 'var(--color-success-bg)',
        warning: 'var(--color-warning)',
        'warning-bg': 'var(--color-warning-bg)',
        info: 'var(--color-info)',
        'info-bg': 'var(--color-info-bg)',
        danger: 'var(--color-danger)',
        'danger-bg': 'var(--color-danger-bg)',

        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        'surface-hover': 'var(--color-surface-hover)',
        'surface-inset': 'var(--color-surface-inset)',
        border: 'var(--color-border)',
        'border-light': 'var(--color-border-light)',
        'border-hover': 'var(--color-border-hover)',

        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'text-inverse': 'var(--color-text-inverse)',
        'text-on-primary': 'var(--color-text-on-primary)',

        'role-buyer': 'var(--color-role-buyer)',
        'role-buyer-bg': 'var(--color-role-buyer-bg)',
        'role-supplier': 'var(--color-role-supplier)',
        'role-supplier-bg': 'var(--color-role-supplier-bg)',
        'role-admin': 'var(--color-role-admin)',
        'role-admin-bg': 'var(--color-role-admin-bg)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        glow: 'var(--shadow-glow)',
        inner: 'var(--shadow-inner)',
      },
    },
  },
};

export default config;
