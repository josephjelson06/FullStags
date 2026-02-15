
import React, { useState } from 'react';
import { Archive, Plus, Trash2, Edit2, AlertCircle, Upload, CheckCircle2, Download, FileText } from 'lucide-react';
import { MOCK_PARTS } from '../constants';

interface SupplierInventoryProps {
  view?: 'manage' | 'add' | 'bulk' | 'low-stock';
  theme: 'light' | 'dark';
}

const SupplierInventory: React.FC<SupplierInventoryProps> = ({ view = 'manage', theme }) => {
  const [pickTime, setPickTime] = useState('18');
  
  const lowStockParts = MOCK_PARTS.filter(p => p.stock <= 3);

  const cardBg = theme === 'dark' ? 'bg-[#161E27] border-slate-800/50' : 'bg-white border-slate-200';
  const inputBg = theme === 'dark' ? 'bg-[#0B1118]/50' : 'bg-slate-50';
  const headingColor = theme === 'dark' ? 'text-white' : 'text-slate-900';

  const renderManage = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${headingColor}`}>Inventory Manager</h1>
        <p className="text-slate-500 text-sm font-medium">Manage parts availability and maintain pick-time SLA for top placement in Mumbai nodes.</p>
      </div>

      <div className={`p-10 rounded-2xl border mb-8 transition-colors duration-300 ${cardBg}`}>
        <h3 className={`text-sm font-bold mb-4 ${headingColor}`}>Pick Time SLA (minutes)</h3>
        <div className="flex items-center gap-8">
          <input 
            type="text" 
            value={pickTime}
            onChange={(e) => setPickTime(e.target.value)}
            className={`w-24 border border-slate-700 rounded-lg px-4 py-3 text-center font-bold outline-none focus:ring-1 focus:ring-orange-500/50 transition-all ${inputBg} ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
          />
          <button className="bg-[#FF6B00] hover:bg-[#E66000] text-white font-bold py-3 px-8 rounded-full transition-all shadow-[0_4px_15px_rgba(255,107,0,0.3)] text-sm">
            Save Pick Time
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-4 italic">Faster pick times = higher ranking in urgent searches. Current status: <span className="text-[#FF6B00] font-bold">OPTIMIZED</span>.</p>
      </div>

      <div className={`p-6 rounded-2xl border mb-8 flex flex-wrap items-end gap-4 transition-colors duration-300 ${cardBg}`}>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Part Name</label>
          <input type="text" placeholder="e.g. Servo Motor" className={`w-full border border-slate-700 rounded-lg px-4 py-3 text-sm outline-none ${inputBg} ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} />
        </div>
        <div className="w-40">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Quantity</label>
          <input type="number" defaultValue="1" className={`w-full border border-slate-700 rounded-lg px-4 py-3 text-sm outline-none ${inputBg} ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} />
        </div>
        <div className="w-40">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Price (₹)</label>
          <input type="text" defaultValue="5000.00" className={`w-full border border-slate-700 rounded-lg px-4 py-3 text-sm outline-none ${inputBg} ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`} />
        </div>
        <button className="bg-[#FF6B00] hover:bg-[#E66000] text-white font-bold py-3 px-10 rounded-full transition-all text-sm ml-auto">
          + Add Item
        </button>
      </div>

      <div className={`rounded-2xl border overflow-hidden transition-colors duration-300 ${cardBg}`}>
        <table className="w-full text-left">
          <thead className={`border-b ${theme === 'dark' ? 'bg-[#0B1118]/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Part Name</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Qty</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Price</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/10">
            {MOCK_PARTS.map((part) => (
              <tr key={part.id} className={`transition-all group ${part.stock <= 1 ? 'bg-red-500/5' : ''}`}>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${part.stock <= 1 ? 'text-red-500' : headingColor} group-hover:text-[#FF6B00] transition-colors`}>{part.name}</span>
                    {part.stock <= 1 && <span className="text-[8px] bg-red-500 text-white font-black px-1 rounded uppercase">Low Stock</span>}
                  </div>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className={`text-sm font-bold ${part.stock <= 3 ? 'text-red-500' : headingColor}`}>{part.stock}</span>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className={`text-sm font-bold ${headingColor}`}>₹{part.price.toFixed(2)}</span>
                </td>
                <td className="px-6 py-5 text-right space-x-2">
                  <button className="p-1.5 text-slate-500 hover:text-[#FF6B00] transition-all"><Edit2 size={14} /></button>
                  <button className="p-1.5 text-slate-500 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      {renderManage()}
    </div>
  );
};

export default SupplierInventory;
