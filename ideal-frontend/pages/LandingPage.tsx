
import React from 'react';
import { 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  Cpu, 
  Navigation, 
  Archive, 
  Bell, 
  ArrowRight, 
  ShieldAlert, 
  ChevronRight,
  Package,
  Globe,
  Sun,
  Moon
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface LandingPageProps {
  onGetStarted: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, theme, toggleTheme }) => {
  const chartData = [
    { time: '10:00', downtime: 100 },
    { time: '10:15', downtime: 95 },
    { time: '10:30', downtime: 40 }, 
    { time: '10:45', downtime: 10 },
    { time: '11:00', downtime: 0 },
  ];

  const bgColor = theme === 'dark' ? 'bg-[#0B1118]' : 'bg-[#F8FAFC]';
  const textColor = theme === 'dark' ? 'text-[#E2E8F0]' : 'text-[#1E293B]';
  const headingColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const navColor = theme === 'dark' ? 'bg-[#0B1118]/80 border-slate-800/50' : 'bg-white/80 border-slate-200';
  const cardColor = theme === 'dark' ? 'bg-[#161E27] border-slate-800' : 'bg-white border-slate-200';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgColor} ${textColor} selection:bg-[#FF6B00] selection:text-white`}>
      {/* Background Grid */}
      <div className={`fixed inset-0 pointer-events-none z-0 opacity-[0.03] ${theme === 'dark' ? 'invert-0' : 'invert'}`} 
           style={{ backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 px-8 h-20 flex items-center justify-between backdrop-blur-xl border-b transition-colors duration-300 ${navColor}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#FF6B00] flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(255,107,0,0.5)]">
            UP
          </div>
          <span className={`text-xl font-bold tracking-tighter ${headingColor}`}>URGENT<span className="text-[#FF6B00]">PARTS</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-xs font-bold text-slate-400 hover:text-[#FF6B00] transition-colors uppercase tracking-widest">Protocol</a>
          <a href="#ecosystem" className="text-xs font-bold text-slate-400 hover:text-[#FF6B00] transition-colors uppercase tracking-widest">Ecosystem</a>
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition-all ${theme === 'dark' ? 'border-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 text-slate-500 hover:text-slate-900'}`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button 
            onClick={onGetStarted}
            className={`px-6 py-2.5 font-bold rounded-lg text-xs uppercase tracking-widest border transition-all shadow-inner ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
            }`}
          >
            Terminal Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-8 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#FF6B00]/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl">
          <div className={`inline-flex items-center gap-2 px-3 py-1 border rounded-full mb-8 animate-fade-in ${theme === 'dark' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Network Status: Indian Subcontinent Hub Online</span>
          </div>
          <h1 className={`text-7xl md:text-8xl font-black leading-[0.9] mb-8 tracking-tighter ${headingColor}`}>
            When the Line Stops, <br />
            <span className="text-[#FF6B00]">We Start.</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Emergency industrial parts matching—connecting Indian manufacturing hubs with the nearest available precision suppliers in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onGetStarted}
              className="w-full sm:w-auto px-10 py-5 bg-[#FF6B00] hover:bg-orange-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,107,0,0.2)] transition-all transform hover:scale-105 active:scale-95"
            >
              DISPATCH EMERGENCY PART <ArrowRight size={20} />
            </button>
            <button 
              onClick={onGetStarted}
              className={`w-full sm:w-auto px-10 py-5 font-bold rounded-2xl border transition-all ${
                theme === 'dark' ? 'bg-slate-900/50 border-slate-800 text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50'
              }`}
            >
              PARTNER AS SUPPLIER
            </button>
          </div>
        </div>
      </section>

      {/* Live Stats Strip */}
      <section className="px-8 mb-32 relative z-10">
        <div className={`max-w-6xl mx-auto p-1 rounded-2xl border shadow-2xl transition-colors duration-300 ${theme === 'dark' ? 'bg-[#161E27] border-slate-800/50' : 'bg-white border-slate-200'}`}>
          <div className={`rounded-xl px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-8 ${theme === 'dark' ? 'bg-[#0B1118]/80' : 'bg-slate-50'}`}>
            <div className="flex flex-col items-center md:items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Avg Downtime Saved</span>
              <p className={`text-3xl font-black ${headingColor}`}>₹2,00,000<span className="text-green-500">/HR</span></p>
            </div>
            <div className={`flex flex-col items-center md:items-start border-y md:border-y-0 md:border-x py-6 md:py-0 md:px-8 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Match Accuracy</span>
              <p className="text-3xl font-black text-[#FF6B00]">99.8<span className="text-slate-500">%</span></p>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Live Supplier Nodes</span>
              <p className="text-3xl font-black text-blue-500">8,400<span className="text-slate-500 text-xl font-bold ml-1">IN</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Narrative Section */}
      <section id="features" className="px-8 mb-32 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div>
          <h2 className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em] mb-4">The Solution</h2>
          <h3 className={`text-5xl font-bold mb-6 leading-tight ${headingColor}`}>Eliminate The Cost of Silence.</h3>
          <p className="text-lg text-slate-500 leading-relaxed mb-8 font-medium">
            Industrial operations in Mumbai, Chennai, and Pune face massive losses due to logistics delays. UrgentParts provides an intelligent system for Indian B2B allocation, nearest supplier matching, and optimized routing.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                <Zap size={24} />
              </div>
              <div>
                <h4 className={`text-lg font-bold mb-1 ${headingColor}`}>Zero-Latency Matching</h4>
                <p className="text-sm text-slate-500">Proprietary algorithms prioritize distance and pick-time to resume production in minutes.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className={`text-lg font-bold mb-1 ${headingColor}`}>Industrial Compliance</h4>
                <p className="text-sm text-slate-500">Secure granular permissions ensure only verified identities handle mission-critical logistics.</p>
              </div>
            </div>
          </div>
        </div>
        <div className={`p-8 rounded-3xl border relative group overflow-hidden transition-colors duration-300 ${cardColor}`}>
          <div className="absolute top-0 right-0 p-4">
            <span className="text-[10px] font-mono font-bold text-orange-500 animate-pulse">UP_SYS_AUDIT: PASS</span>
          </div>
          <div className="h-64 mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke={theme === 'dark' ? '#4A5568' : '#CBD5E1'} fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme === 'dark' ? '#0B1118' : '#FFFFFF', 
                    border: `1px solid ${theme === 'dark' ? '#2D3748' : '#E2E8F0'}`, 
                    borderRadius: '8px' 
                  }}
                  itemStyle={{ color: '#FF6B00', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="downtime" stroke="#FF6B00" strokeWidth={3} fillOpacity={1} fill="url(#colorDown)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Deployment Efficiency</p>
              <p className={`text-2xl font-black ${headingColor}`}>43 Min Avg.</p>
            </div>
            <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <TrendingUp className="text-green-500" size={24} />
            </div>
          </div>
        </div>
      </section>

      {/* User Ecosystem */}
      <section id="ecosystem" className={`px-8 py-32 relative transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
        <div className="max-w-6xl mx-auto text-center mb-20">
          <h2 className={`text-4xl font-bold mb-4 tracking-tight ${headingColor}`}>Three Roles, One Objective.</h2>
          <p className="text-slate-500 max-w-xl mx-auto uppercase text-xs font-bold tracking-widest">A purpose-built ecosystem for the industrial world.</p>
        </div>
        
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              role: 'Buyer', 
              icon: Globe, 
              color: 'orange',
              desc: 'Find critical parts nearby with AI-ranked matching and live delivery telemetry.' 
            },
            { 
              role: 'Supplier', 
              icon: Package, 
              color: 'blue',
              desc: 'Monetize your high-precision inventory by fulfilling high-priority local requests.' 
            },
            { 
              role: 'Admin', 
              icon: ShieldCheck, 
              color: 'purple',
              desc: 'Total platform oversight: monitoring global routes, match logs, and system health.' 
            }
          ].map(role => (
            <div key={role.role} className={`p-10 rounded-3xl border hover:translate-y-[-8px] transition-all group ${cardColor}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-inner transition-colors ${
                role.color === 'orange' ? 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500 group-hover:text-white' :
                role.color === 'blue' ? 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white' :
                'bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white'
              }`}>
                <role.icon size={28} />
              </div>
              <h4 className={`text-2xl font-bold mb-4 tracking-tight ${headingColor}`}>{role.role} Terminal</h4>
              <p className="text-slate-500 leading-relaxed text-sm font-medium">
                {role.desc}
              </p>
              <div className="mt-8 flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-[#FF6B00] transition-colors cursor-pointer" onClick={onGetStarted}>
                ENTER PROTOCOL <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-20 border-t border-slate-800/50 text-center">
        <div className="flex items-center justify-center gap-3 mb-8 opacity-50 grayscale hover:grayscale-0 transition-all cursor-pointer">
          <div className="w-6 h-6 rounded bg-[#FF6B00] flex items-center justify-center font-bold text-white text-[10px]">
            UP
          </div>
          <span className={`text-sm font-bold tracking-tighter ${headingColor}`}>URGENT<span className="text-[#FF6B00]">PARTS</span></span>
        </div>
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em]">© 2024 UrgentParts India • Strategic Industrial Logistics • Mumbai Node</p>
      </footer>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
};

export default LandingPage;
