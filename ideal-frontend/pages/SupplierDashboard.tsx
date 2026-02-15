
import React from 'react';
import { 
  TrendingUp, 
  Package, 
  Clock, 
  ShieldCheck, 
  ArrowUpRight,
  ChevronRight,
  Zap
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

const data = [
  { name: 'Week 1', revenue: 4500 },
  { name: 'Week 2', revenue: 5200 },
  { name: 'Week 3', revenue: 6800 },
  { name: 'Week 4', revenue: 12500 },
  { name: 'Week 5', revenue: 9800 },
];

const SupplierDashboard: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Supplier Commander</h1>
        <p className="text-slate-400">FastParts Distribution performance overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Revenue" value="$48,250" icon={TrendingUp} trend={{ value: '+24%', positive: true }} color="orange" />
        <StatCard label="Active Orders" value="12" icon={Package} color="blue" />
        <StatCard label="Avg. Pick Time" value="24m" icon={Clock} trend={{ value: '-3m', positive: true }} color="green" />
        <StatCard label="Inv. Health" value="92%" icon={ShieldCheck} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 surface-card p-8 rounded-2xl glow-orange">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-[#FF6B00]" size={20} /> Revenue Trends
            </h2>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
                <XAxis dataKey="name" stroke="#718096" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#718096" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161E27', border: '1px solid #2D3748', borderRadius: '8px' }}
                  itemStyle={{ color: '#FF6B00' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#FF6B00" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-card p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Service Level Agreement</h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <span>Dispatch Speed</span>
                  <span className="text-white">98%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 w-[98%] shadow-[0_0_8px_rgba(255,107,0,0.5)]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  <span>Part Accuracy</span>
                  <span className="text-white">100%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[100%] shadow-[0_0_8px_rgba(0,123,255,0.5)]" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">PRO TIP</p>
            <p className="text-xs text-slate-400">Improving dispatch speed by <span className="text-white font-bold">2 minutes</span> increases match probability by <span className="text-white font-bold">12.5%</span>.</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="surface-card rounded-2xl overflow-hidden border border-slate-800">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-white">Recent Top Matches</h3>
            <ArrowUpRight size={18} className="text-slate-500" />
          </div>
          <div className="p-4 space-y-4">
             {[1,2,3].map(i => (
               <div key={i} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <Zap size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Match Query #{1040 + i}</p>
                      <p className="text-xs text-slate-500">Matched via: "Proximity & Rating"</p>
                    </div>
                 </div>
                 <span className="text-sm font-mono font-bold text-green-400">9{i}%</span>
               </div>
             ))}
          </div>
        </div>

        <div className="surface-card rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center p-12 text-center">
           <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <ShieldCheck className="text-blue-500" size={32} />
           </div>
           <h3 className="text-lg font-bold text-white mb-2">Verified Supplier Status</h3>
           <p className="text-sm text-slate-500 max-w-xs mb-8">Maintain your 4.5+ rating to stay eligible for "Priority Matching" in major logistics hubs.</p>
           <button className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-all font-bold text-sm">
             VIEW RATING DETAILS
           </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
