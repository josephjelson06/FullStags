import { Outlet } from 'react-router-dom';

import { Header } from '@/layouts/Header';
import { Sidebar } from '@/layouts/Sidebar';

export function AppLayout() {
  return (
    <div className="flex min-h-screen transition-colors duration-300" style={{ background: 'var(--color-bg)' }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="animate-fade-in mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
