
import React, { useState, useEffect } from 'react';
import { ClipboardList, Clock, Truck, CheckCircle2, XCircle, AlertCircle, History, Package } from 'lucide-react';
import { MOCK_ORDERS } from '../constants';
import { Order } from '../types';

const SupplierFulfillment: React.FC<{ view: 'incoming' | 'history' }> = ({ view }) => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [seconds, setSeconds] = useState(1800); // 30 min mock SLA

  useEffect(() => {
    if (view === 'incoming') {
      const timer = setInterval(() => {
        setSeconds(s => s > 0 ? s - 1 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [view]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const spawnTestOrder = () => {
    const newOrder: Order = {
      id: 'ORD-1029',
      partName: 'Hydraulic Pressure Sensor',
      status: 'PENDING',
      buyer: 'Tesla Gigafactory',
      supplier: 'FastParts Distribution',
      eta: '30m',
      timestamp: new Date().toLocaleString(),
      pickTimeSLA: 1800
    };
    setActiveOrders([newOrder, ...activeOrders]);
  };

  if (view === 'history') {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <History className="text-[#007BFF]" /> Order History
        </h1>
        <div className="surface-card rounded-2xl overflow-hidden border border-slate-800">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Part & Buyer</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {MOCK_ORDERS.map(order => (
                <tr key={order.id} className="hover:bg-slate-800/30 transition-all">
                  <td className="px-6 py-4 text-orange-500 font-mono font-bold text-sm">#{order.id}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-white">{order.partName}</p>
                    <p className="text-xs text-slate-500">{order.buyer}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      order.status === 'DELIVERED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                      order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                      order.status === 'DISPUTED' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                      'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-slate-500 font-mono">{order.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ClipboardList className="text-[#FF6B00]" /> Incoming Urgent Orders
        </h1>
        <button 
          onClick={spawnTestOrder}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition-all text-xs font-bold"
        >
          SIMULATE NEW ORDER
        </button>
      </div>

      {activeOrders.length === 0 ? (
        <div className="h-[400px] surface-card rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <Package className="text-slate-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Ready for Dispatch</h2>
          <p className="text-slate-500 max-w-xs mb-8">Incoming orders from nearby manufacturing plants will appear here in real-time.</p>
          <div className="flex items-center gap-3 px-4 py-2 bg-green-500/5 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Listening for Matches...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeOrders.map(order => (
            <div key={order.id} className="surface-card p-6 rounded-2xl border-2 border-orange-500/30 glow-orange flex flex-col gap-6 animate-bounce-in relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-500 text-[10px] font-black tracking-tighter uppercase animate-pulse">
                   <AlertCircle size={10} /> Urgent SLA
                 </div>
               </div>
               
               <div>
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Incoming Part Request</h3>
                  <h2 className="text-xl font-bold text-white">{order.partName}</h2>
               </div>

               <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Buyer</span>
                    <span className="text-white font-bold">{order.buyer}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Dispatch Target</span>
                    <span className="text-blue-400 font-mono font-bold">12km / 14m</span>
                  </div>
               </div>

               <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pick Time Remaining</span>
                    <span className={`text-sm font-mono font-bold ${seconds < 300 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                      {formatTime(seconds)}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 transition-all duration-1000" 
                      style={{ width: `${(seconds / 1800) * 100}%` }}
                    />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3 mt-4">
                 <button className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all text-xs border border-slate-700 flex items-center justify-center gap-2">
                   <XCircle size={16} /> REJECT
                 </button>
                 <button className="py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all text-xs shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
                   <CheckCircle2 size={16} /> ACCEPT ORDER
                 </button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierFulfillment;
