
import React, { useState, useEffect } from 'react';
import { Role, Toast } from './types';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import PlaceholderPage from './pages/PlaceholderPage';
import SupplierInventory from './pages/SupplierInventory';
import SupplierMatches from './pages/SupplierMatches';
import SupplierRoutes from './pages/SupplierRoutes';
import SupplierOrders from './pages/SupplierOrders';
import SupplierAnalytics from './pages/SupplierAnalytics';
import Profile from './pages/Profile';
import { Bell, Zap, Info, CheckCircle2, AlertTriangle, XCircle, X, LogOut, Sun, Moon } from 'lucide-react';

type AppView = 'landing' | 'auth' | 'app';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('landing');
  const [role, setRole] = useState<Role | null>(null);
  const [activeTab, setActiveTab] = useState('inventory');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    if (role === 'SUPPLIER') setActiveTab('inventory');
  }, [role]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const addToast = (title: string, message: string, type: Toast['type']) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const handleLogin = (selectedRole: Role) => {
    setRole(selectedRole);
    setView('app');
    addToast('Authorization Successful', `Welcome back, ${selectedRole}. All systems nominal.`, 'SUCCESS');
  };

  if (view === 'landing') {
    return <LandingPage onGetStarted={() => setView('auth')} theme={theme} toggleTheme={toggleTheme} />;
  }

  if (view === 'auth') {
    return <Login onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'inventory':
        return <SupplierInventory view="manage" theme={theme} />;
      case 'supplier-matches':
        return <SupplierMatches theme={theme} />;
      case 'supplier-routes':
        return <SupplierRoutes theme={theme} />;
      case 'add-part':
        return <SupplierInventory view="add" theme={theme} />;
      case 'bulk-upload':
        return <SupplierInventory view="bulk" theme={theme} />;
      case 'low-stock':
        return <SupplierInventory view="low-stock" theme={theme} />;
      case 'incoming-orders':
        return <SupplierOrders view="incoming" theme={theme} />;
      case 'order-history':
        return <SupplierOrders view="history" theme={theme} />;
      case 'notifications':
        return <PlaceholderPage module="NOTIFICATIONS" title="My Notifications" description="All notifications: new orders, status updates, low stock alerts, ratings received, match requests, payments. Real-time via WebSocket." icon="NOTIF" theme={theme} />;
      case 'supplier-dashboard':
        return <SupplierAnalytics theme={theme} />;
      case 'reports':
        return <SupplierAnalytics theme={theme} />;
      case 'profile':
        return <Profile theme={theme} />;
      default:
        return <div className="p-20 text-center text-slate-500">Subsystem Offline</div>;
    }
  };

  const themeClasses = theme === 'dark' 
    ? 'bg-[#0B1118] text-[#E2E8F0]' 
    : 'bg-[#F8FAFC] text-[#1E293B]';

  const headerClasses = theme === 'dark'
    ? 'bg-[#0B1118]/80 border-slate-800/50'
    : 'bg-white/80 border-slate-200';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses}`}>
      <Sidebar 
        currentRole={role!} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onLogout={() => setView('landing')}
        theme={theme}
      />
      
      <main className="pl-64 min-h-screen flex flex-col">
        <header className={`h-16 border-b px-8 flex items-center justify-between sticky top-0 backdrop-blur-md z-40 transition-colors duration-300 ${headerClasses}`}>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded bg-[#FF6B00] flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(255,107,0,0.4)]">
              UP
            </div>
            <div>
              <h1 className={`text-sm font-bold tracking-tight leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>UrgentParts</h1>
              <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tight">When the line stops, we start.</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-lg border transition-all ${theme === 'dark' ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="text-right">
              <p className={`text-xs font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>FastParts Distribution</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Node IN-MUM-01</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-[#FF6B00] font-black text-xs shadow-inner ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-100'}`}>
                FD
              </div>
              <div className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tighter ${theme === 'dark' ? 'border-slate-700 text-white bg-slate-800/30' : 'border-slate-200 text-slate-700 bg-slate-50'}`}>
                Supplier
              </div>
              <button onClick={() => setView('landing')} className="text-slate-500 hover:text-red-500 transition-all ml-2 p-1.5 rounded-lg">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto">
          {renderContent()}
        </section>
      </main>

      {/* Global Toast System */}
      <div className="fixed bottom-8 right-8 z-[100] space-y-4 max-w-sm w-full">
        {toasts.map(toast => (
          <div key={toast.id} className={`px-5 py-4 rounded-xl shadow-2xl border-l-4 flex items-start gap-4 animate-bounce-in transition-all ${theme === 'dark' ? 'bg-[#161E27] border-slate-700' : 'bg-white border-slate-200'}`} style={{
            borderColor: toast.type === 'SUCCESS' ? '#22c55e' : toast.type === 'WARNING' ? '#f59e0b' : toast.type === 'ERROR' ? '#ef4444' : '#3b82f6'
          }}>
            <div className="shrink-0 mt-0.5">
              {toast.type === 'SUCCESS' && <CheckCircle2 className="text-green-500" size={20} />}
              {toast.type === 'WARNING' && <AlertTriangle className="text-amber-500" size={20} />}
              {toast.type === 'ERROR' && <XCircle className="text-red-500" size={20} />}
              {toast.type === 'INFO' && <Info className="text-blue-500" size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{toast.title}</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes bounce-in {
          0% { transform: translateY(100px); opacity: 0; scale: 0.9; }
          70% { transform: translateY(-10px); opacity: 1; scale: 1.05; }
          100% { transform: translateY(0); opacity: 1; scale: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .glow-orange { box-shadow: 0 0 20px rgba(255,107,0,0.1); }
        .glow-red { box-shadow: 0 0 20px rgba(239,68,68,0.1); }
      `}</style>
    </div>
  );
};

export default App;
