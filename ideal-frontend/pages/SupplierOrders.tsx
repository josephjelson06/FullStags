
import React, { useState, useEffect } from 'react';
import { ClipboardList, Clock, CheckCircle2, XCircle, Download, ExternalLink, Package, History } from 'lucide-react';
import { MOCK_ORDERS, MOCK_HISTORY } from '../constants';

const SupplierOrders: React.FC<{ view: 'incoming' | 'history' }> = ({ view }) => {
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const incomingOrder = MOCK_ORDERS.find(o => o.id === 'UP-8904');

  if (view === 'incoming') {
    return (
      <div className="p-8 space-y-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Command Center: Incoming</h1>
          <p className="text-slate-400">Accept or decline mission-critical requests assigned to your warehouse.</p>
        </div>

        {incomingOrder ? (
          <div className="max-w-3xl surface-card p-10 rounded-3xl border-2 border-orange-500/40 glow-orange bg-[#161E27]/60 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] pointer-events-none group-hover:bg-orange-500/10 transition-all" />
             
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500 shadow-inner">
                    <ClipboardList size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white italic">Urgent Part Request</h2>
                    <p className="text-sm font-mono text-slate-500 uppercase tracking-widest mt-1">ID: {incomingOrder.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pick Time SLA</p>
                  <div className={`text-3xl font-mono font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-orange-500'} tabular-nums`}>
                    {formatTime(timeLeft)}
                  </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                   <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Industrial Item</p>
                   <p className="text-lg font-bold text-white mb-4">{incomingOrder.partName}</p>
                   <div className="flex items-center gap-2 text-xs text-blue-400 font-bold">
                      <Package size={14} /> Qty: 1 Unit (Precision Spec)
                   </div>
                </div>
                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                   <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Requesting Entity</p>
                   <p className="text-lg font-bold text-white mb-4">{incomingOrder.buyer}</p>
                   <p className="text-xs text-slate-500 italic">"Production line 4 halted. Immediate dispatch required."</p>
                </div>
             </div>

             <div className="flex gap-4">
                <button className="flex-1 py-4 border border-slate-700 hover:bg-slate-800 rounded-2xl text-slate-400 font-bold transition-all flex items-center justify-center gap-2">
                   <XCircle size={20} /> DECLINE REQUEST
                </button>
                <button className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-xl shadow-orange-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-95">
                   <CheckCircle2 size={20} /> ACCEPT & DISPATCH
                </button>
             </div>
          </div>
        ) : (
          <div className="h-96 surface-card rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center opacity-40">
            <Package size={48} className="text-slate-600 mb-4" />
            <p className="text-slate-500">No active incoming requests detected.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fade-in">
       <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Order History & Fulfillment Logs</h1>
          <p className="text-slate-400">Auditable history of all emergency shipments and platform performance.</p>
        </div>

        <div className="surface-card rounded-3xl overflow-hidden border border-slate-800 bg-[#161E27]/30">
           <table className="w-full text-left">
              <thead className="bg-[#0B1118]/50 border-b border-slate-800">
                 <tr>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Order ID</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Part & Destination</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dispatch Time</th>
                    <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Documents</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                 {MOCK_HISTORY.map(order => (
                   <tr key={order.id} className="hover:bg-slate-800/20 transition-all group">
                      <td className="px-6 py-5">
                         <span className="text-orange-500 font-mono font-bold text-sm tracking-wider">#{order.id}</span>
                      </td>
                      <td className="px-6 py-5">
                         <p className="text-sm font-bold text-white">{order.partName}</p>
                         <p className="text-[10px] text-slate-500 uppercase mt-0.5 tracking-tight font-medium">{order.buyer}</p>
                      </td>
                      <td className="px-6 py-5">
                         <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                           order.status === 'DELIVERED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                           order.status === 'DISPUTED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                           'bg-slate-800 text-slate-400'
                         }`}>
                           {order.status}
                         </span>
                      </td>
                      <td className="px-6 py-5">
                         <p className="text-xs text-slate-400 font-mono">{order.timestamp}</p>
                      </td>
                      <td className="px-6 py-5 text-right">
                         <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-700 shadow-inner">
                            <Download size={14} />
                         </button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
    </div>
  );
};

export default SupplierOrders;
