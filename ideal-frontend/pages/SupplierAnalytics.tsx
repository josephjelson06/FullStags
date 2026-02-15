
import React from 'react';
import { TrendingUp, Clock, Package, ShieldCheck, FileText, Zap } from 'lucide-react';
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
  { name: 'Mon', revenue: 45000 },
  { name: 'Tue', revenue: 52000 },
  { name: 'Wed', revenue: 48000 },
  { name: 'Thu', revenue: 125000 }, 
  { name: 'Fri', revenue: 98000 },
  { name: 'Sat', revenue: 30000 },
  { name: 'Sun', revenue: 27000 },
];

interface SupplierAnalyticsProps {
  theme: 'light' | 'dark';
}

const SupplierAnalytics: React.FC<SupplierAnalyticsProps> = ({ theme }) => {
  const cardBg = theme === 'dark' ? 'bg-[#161E27] border-slate-800' : 'bg-white border-slate-200';
  const headingColor = theme === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${headingColor}`}>Performance Intelligence</h1>
          <p className="text-slate-500 font-medium">FastParts Distribution • India Operations Audit</p>
        </div>
        <button className={`px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all border ${
          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900'
        }`}>
           <FileText size={16} /> EXPORT FULL AUDIT
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Revenue" value="₹4,25,000" icon={TrendingUp} trend={{ value: '+24%', positive: true }} color="orange" />
        <StatCard label="Avg Pick Time" value="18m" icon={Clock} trend={{ value: '-5m', positive: true }} color="blue" />
        <StatCard label="Orders Fulfilled" value="124" icon={Package} color="green" />
        <StatCard label="SLA Adherence" value="99%" icon={ShieldCheck} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 p-8 rounded-3xl border transition-colors duration-300 ${cardBg}`}>
           <div className="flex justify-between items-center mb-8">
              <h2 className={`text-xl font-bold flex items-center gap-3 ${headingColor}`}>
                 <Zap className="text-orange-500" size={24} /> Urgent Request Trends (INR)
              </h2>
           </div>
           <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#2D3748' : '#E2E8F0'} vertical={false} />
                  <XAxis dataKey="name" stroke="#4A5568" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4A5568" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: theme === 'dark' ? '#0B1118' : '#FFFFFF', 
                      border: `1px solid ${theme === 'dark' ? '#2D3748' : '#E2E8F0'}`, 
                      borderRadius: '12px' 
                    }}
                    itemStyle={{ color: '#FF6B00', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#FF6B00" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className={`p-8 rounded-3xl border flex flex-col justify-between transition-colors duration-300 ${cardBg}`}>
           <div>
              <h3 className={`text-lg font-bold mb-6 ${headingColor}`}>Dispatch Breakdown</h3>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                       <span>CNC Tools</span>
                       <span className={headingColor}>45%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full"><div className="h-full bg-orange-500 w-[45%]" /></div>
                 </div>
                 <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                       <span>Hydraulics</span>
                       <span className={headingColor}>32%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full"><div className="h-full bg-blue-500 w-[32%]" /></div>
                 </div>
                 <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                       <span>Sensors</span>
                       <span className={headingColor}>23%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full"><div className="h-full bg-green-500 w-[23%]" /></div>
                 </div>
              </div>
           </div>

           <div className={`mt-10 p-4 border rounded-2xl ${theme === 'dark' ? 'bg-orange-500/5 border-orange-500/10' : 'bg-orange-50 border-orange-200'}`}>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-tighter mb-1">Weekly Insight</p>
              <p className="text-xs text-slate-500 font-medium">High-priority matches are <span className="text-[#FF6B00] font-bold">up 14%</span> this week due to Pune automotive supply chain volatility.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierAnalytics;
