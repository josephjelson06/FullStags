
import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  Truck, 
  ShieldCheck, 
  Zap,
  ArrowUpRight,
  Package
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const data = [
  { name: 'Mon', savings: 12000, orders: 45 },
  { name: 'Tue', savings: 15500, orders: 52 },
  { name: 'Wed', savings: 11000, orders: 38 },
  { name: 'Thu', savings: 18000, orders: 65 },
  { name: 'Fri', savings: 22000, orders: 82 },
  { name: 'Sat', savings: 9000, orders: 20 },
  { name: 'Sun', savings: 11000, orders: 25 },
];

const categoryData = [
  { name: 'Mechanical', value: 400 },
  { name: 'Electrical', value: 300 },
  { name: 'Sensors', value: 300 },
  { name: 'Hydraulics', value: 200 },
];

const COLORS = ['#FF6B00', '#007BFF', '#10B981', '#6366F1'];

const Dashboard: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Platform Overview</h1>
          <p className="text-slate-400">Mission critical performance metrics for Q4 2023.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-800/50 border border-slate-700 px-4 py-2 rounded-lg flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Network Health</span>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => <div key={i} className="w-1.5 h-3 bg-green-500/80 rounded-sm" />)}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard label="Orders Today" value="124" icon={Package} trend={{ value: '+12%', positive: true }} color="orange" />
        <StatCard label="Avg Match Time" value="42s" icon={Zap} color="blue" />
        <StatCard label="Avg Delivery" value="18m" icon={Truck} trend={{ value: '-2m', positive: true }} color="green" />
        <StatCard label="Fulfillment %" value="99.4%" icon={ShieldCheck} color="purple" />
        <StatCard label="Downtime Saved" value="$1.2M" icon={TrendingUp} trend={{ value: '+24%', positive: true }} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Area Chart */}
        <div className="lg:col-span-2 surface-card p-8 rounded-2xl glow-orange">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-[#FF6B00]" size={20} /> Cumulative Downtime Savings ($)
            </h2>
            <select className="bg-slate-900 border border-slate-700 text-slate-400 text-xs rounded-lg px-3 py-1.5 outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
                <XAxis dataKey="name" stroke="#718096" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#718096" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161E27', border: '1px solid #2D3748', borderRadius: '8px' }}
                  itemStyle={{ color: '#FF6B00', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="savings" stroke="#FF6B00" strokeWidth={3} fillOpacity={1} fill="url(#colorSavings)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Doughnut */}
        <div className="surface-card p-8 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-8">Order Distribution</h2>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-white">1,240</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Orders</span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {categoryData.map((item, index) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-sm text-slate-400">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-white">{(item.value / 1200 * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Mini-table */}
      <div className="mt-8 surface-card rounded-2xl overflow-hidden border border-slate-800">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Critical Activity Log</h2>
          <button className="text-orange-500 text-xs font-bold hover:underline flex items-center gap-1">
            VIEW ALL LOGS <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-slate-800">
              {[1, 2, 3, 4].map((i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Zap size={16} className="text-[#FF6B00]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">New high-priority match found</p>
                        <p className="text-xs text-slate-500">Order #1024 matched with Industrial Direct (98% confidence)</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs font-mono text-slate-500">4m ago</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
