
import React from 'react';
import { Map, Zap, Clock, Navigation, AlertTriangle, ShieldCheck } from 'lucide-react';
import { MOCK_ORDERS } from '../constants';

const RouteMonitoring: React.FC = () => {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-slate-800 bg-[#0B1118]">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Navigation className="text-[#007BFF]" /> Live Route Monitoring
        </h1>
        <p className="text-slate-400">Real-time spatial awareness of all emergency industrial shipments.</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main View: Map Placeholder */}
        <div className="flex-1 relative bg-[#0D141D] p-10 overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2D3748" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Glowing Map Nodes */}
          <div className="relative w-full h-full border border-slate-800 rounded-3xl overflow-hidden flex items-center justify-center bg-slate-900/30">
            {/* SVG Illustration of nodes and paths */}
            <svg viewBox="0 0 800 500" className="w-full h-full max-w-4xl">
              {/* Paths */}
              <path d="M 100 100 Q 400 50 700 400" stroke="#007BFF" strokeWidth="2" strokeDasharray="10,5" fill="none" className="opacity-50" />
              <path d="M 100 100 Q 200 300 500 400" stroke="#FF6B00" strokeWidth="3" fill="none" className="animate-[dash_10s_linear_infinite]" />
              
              {/* Suppliers */}
              <circle cx="100" cy="100" r="8" fill="#FF6B00" className="animate-pulse" />
              <text x="115" y="105" fill="white" fontSize="12" fontWeight="bold">S-104 WAREHOUSE</text>
              
              {/* Buyers */}
              <circle cx="700" cy="400" r="8" fill="#007BFF" />
              <text x="715" y="405" fill="white" fontSize="12" fontWeight="bold">TESLA GIGA-1</text>
              
              <circle cx="500" cy="400" r="8" fill="#007BFF" />
              <text x="515" y="405" fill="white" fontSize="12" fontWeight="bold">AMAZON ORD-1</text>
              
              {/* Floating Shipments */}
              <g className="animate-[move_15s_infinite]">
                <rect x="245" y="245" width="20" height="12" rx="4" fill="#FF6B00" />
                <circle cx="255" cy="251" r="2" fill="white" />
              </g>
            </svg>

            {/* Floating Overlay Controls */}
            <div className="absolute top-6 left-6 flex flex-col gap-3">
              <div className="surface-card px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">Network Secure</span>
              </div>
              <div className="surface-card px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-3">
                <Zap size={14} className="text-[#FF6B00]" />
                <span className="text-xs font-bold text-white uppercase tracking-widest">12 Active Couriers</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar List: Live Routes */}
        <div className="w-[400px] border-l border-slate-800 bg-[#0B1118] flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm">Active Deliveries</h3>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] rounded-full">LIVE</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {MOCK_ORDERS.filter(o => o.status !== 'DELIVERED').map(order => (
              <div key={order.id} className="surface-card p-5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full mb-2 inline-block">
                      {order.id}
                    </span>
                    <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">{order.partName}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white flex items-center gap-1 justify-end">
                      <Clock size={16} className="text-slate-500" /> {order.eta}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ETA</p>
                  </div>
                </div>

                {/* Breadcrumb Timeline */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-1 bg-green-500 rounded-full" />
                  <div className="flex-1 h-1 bg-green-500 rounded-full" />
                  <div className="flex-1 h-1 bg-slate-700 rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500 animate-[progress_2s_infinite]" />
                  </div>
                  <div className="flex-1 h-1 bg-slate-800 rounded-full" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                      order.status === 'MATCHING' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                      order.status === 'IN_TRANSIT' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                      'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <ShieldCheck size={12} className="text-green-500" /> SECURE
                  </div>
                </div>
              </div>
            ))}

            {/* Alert State */}
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex gap-4">
              <AlertTriangle className="text-red-500 shrink-0" size={20} />
              <div>
                <p className="text-sm font-bold text-white mb-1">Bridge Obstruction: ORD-992</p>
                <p className="text-xs text-slate-400">Rerouting courier via I-94 alternate to maintain <span className="text-red-400 font-bold">15min SLA</span>.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -200; }
        }
        @keyframes move {
          0% { transform: translate(0, 0); }
          50% { transform: translate(200px, 100px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default RouteMonitoring;
