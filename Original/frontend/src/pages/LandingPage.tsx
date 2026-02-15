import { Link } from 'react-router-dom';

const STATS = [
  { label: 'Avg Match Time', value: '< 45s', icon: 'âš¡' },
  { label: 'Active Suppliers', value: '1,200+', icon: 'ðŸ­' },
  { label: 'Downtime Saved', value: 'â‚¹2Cr+', icon: 'ðŸ“ˆ' },
  { label: 'Parts Cataloged', value: '50,000+', icon: 'ðŸ”§' },
];

const FEATURES = [
  {
    icon: 'ðŸŽ¯',
    title: 'Intelligent Matching',
    description: 'Our proprietary engine finds the nearest supplier with the right part in seconds, not hours.',
  },
  {
    icon: 'ðŸ›£ï¸',
    title: 'Route Optimization',
    description: 'Dynamic routing ensures the fastest delivery path â€” factoring in traffic, weather, and priority.',
  },
  {
    icon: 'ðŸ“Š',
    title: 'Real-Time Analytics',
    description: 'Track every metric â€” from match time to delivery success â€” on a live command center dashboard.',
  },
];

const ECOSYSTEM = [
  {
    role: 'Factory Buyers',
    description: 'Submit emergency part requests and get matched with the nearest supplier in real-time.',
    color: 'var(--color-role-buyer)',
    icon: 'ðŸ—ï¸',
  },
  {
    role: 'Part Suppliers',
    description: 'List your inventory and receive urgent orders â€” boosting revenue from idle stock.',
    color: 'var(--color-role-supplier)',
    icon: 'ðŸ“¦',
  },
  {
    role: 'Platform Admins',
    description: 'Monitor the entire network, resolve disputes, and fine-tune matching parameters.',
    color: 'var(--color-role-admin)',
    icon: 'ðŸ›¡ï¸',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
      {/* â”€â”€ Navigation â”€â”€ */}
      <nav
        className="sticky top-0 z-20 flex items-center justify-between px-8 py-4"
        style={{
          background: 'color-mix(in srgb, var(--color-bg) 85%, transparent)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded text-sm font-bold text-white"
            style={{ background: 'var(--color-primary)', boxShadow: '0 0 15px rgba(255,107,0,0.4)' }}
          >
            UP
          </div>
          <span className="text-lg font-bold tracking-tight">
            URGENT<span style={{ color: 'var(--color-primary)' }}>PARTS</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="rounded-lg px-5 py-2 text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: 'var(--color-primary)', boxShadow: '0 0 15px rgba(255,107,0,0.3)' }}
          >
            Launch App â†’
          </Link>
        </div>
      </nav>

      {/* â”€â”€ Hero Section â”€â”€ */}
      <section className="relative overflow-hidden px-8 py-32 text-center">
        <div
          className="pointer-events-none absolute top-[-30%] left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full"
          style={{ background: 'rgba(255,107,0,0.08)', filter: 'blur(120px)' }}
        />
        <div className="relative z-10 mx-auto max-w-4xl">
          <div
            className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
            style={{
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              border: '1px solid rgba(255,107,0,0.2)',
            }}
          >
            <span className="inline-block h-2 w-2 rounded-full animate-pulse-dot" style={{ background: 'var(--color-primary)' }} />
            Emergency Industrial Parts Platform
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            When the line stops,
            <br />
            <span style={{ color: 'var(--color-primary)' }}>we start.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Proprietary matching engine connecting mission-critical factories with the nearest available
            precision parts â€” in seconds, not hours.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              to="/login"
              className="rounded-xl px-8 py-4 text-base font-bold text-white transition-all hover:shadow-lg active:scale-95"
              style={{ background: 'var(--color-primary)', boxShadow: '0 0 25px rgba(255,107,0,0.4)' }}
            >
              Access Command Center â†’
            </Link>
            <Link
              to="/signup"
              className="surface-card rounded-xl px-8 py-4 text-base font-bold transition-all hover:shadow-md"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Register Entity
            </Link>
          </div>
        </div>
      </section>

      {/* â”€â”€ Live Stats Strip â”€â”€ */}
      <section
        className="border-y px-8 py-8"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-xl" style={{ background: 'var(--color-primary-light)' }}>
                {stat.icon}
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{stat.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€ Features Section â”€â”€ */}
      <section className="px-8 py-24">
        <div className="mx-auto max-w-5xl">
          <p
            className="mb-3 text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-primary)' }}
          >
            Why UrgentParts
          </p>
          <h2 className="text-3xl font-bold tracking-tight">
            Purpose-built for emergency industrial logistics
          </h2>
          <p className="mt-3 max-w-xl text-base" style={{ color: 'var(--color-text-secondary)' }}>
            Every minute of downtime costs thousands. Our platform eliminates the phone-chain
            scramble with intelligent automation.
          </p>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="surface-card group rounded-2xl p-8 transition-all hover:shadow-lg"
                style={{ borderLeft: '4px solid var(--color-primary)' }}
              >
                <div
                  className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl text-2xl transition-transform group-hover:scale-110"
                  style={{ background: 'var(--color-primary-light)' }}
                >
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Ecosystem Section â”€â”€ */}
      <section
        className="border-t px-8 py-24"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div className="mx-auto max-w-5xl">
          <p
            className="mb-3 text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-primary)' }}
          >
            User Ecosystem
          </p>
          <h2 className="text-3xl font-bold tracking-tight">Three roles. One mission.</h2>
          <p className="mt-3 max-w-xl text-base" style={{ color: 'var(--color-text-secondary)' }}>
            Every participant in the supply chain has a dedicated command center tailored to their workflow.
          </p>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {ECOSYSTEM.map((item) => (
              <article
                key={item.role}
                className="surface-card rounded-2xl p-8 transition-all hover:shadow-lg"
                style={{ borderTop: `3px solid ${item.color}` }}
              >
                <div className="mb-4 text-3xl">{item.icon}</div>
                <h3 className="text-lg font-bold" style={{ color: item.color }}>
                  {item.role}
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Footer â”€â”€ */}
      <footer
        className="border-t px-8 py-8 text-center"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)' }}
      >
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          Â© 2026 UrgentParts â€” Emergency Industrial Parts Platform. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
