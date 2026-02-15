
import React, { useState } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Edit2, Archive, X, AlertCircle } from 'lucide-react';
import { MOCK_PARTS } from '../constants';
import { Part } from '../types';

const InventoryManager: React.FC = () => {
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParts = MOCK_PARTS.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 relative min-h-screen overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Archive className="text-[#FF6B00]" /> Master Inventory Catalog
          </h1>
          <p className="text-slate-400">Manage all registered parts and real-time stock availability across the platform.</p>
        </div>
        <button className="bg-[#FF6B00] hover:bg-[#E66000] text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(255,107,0,0.4)] transition-all">
          <Plus size={18} /> Add New Part
        </button>
      </div>

      {/* Filter Bar */}
      <div className="surface-card p-4 rounded-xl mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by part name or SKU..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:text-white transition-all">
          <Filter size={18} /> Filters
        </button>
      </div>

      {/* Inventory Table */}
      <div className="surface-card rounded-2xl overflow-hidden border border-slate-800">
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Part Name & SKU</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Unit Price</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Stock Level</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredParts.map(part => (
              <tr 
                key={part.id} 
                onClick={() => setSelectedPart(part)}
                className="hover:bg-slate-800/30 transition-all cursor-pointer group"
              >
                <td className="px-6 py-5">
                  <div className="font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">{part.name}</div>
                  <div className="text-xs text-slate-500 font-mono tracking-wider">{part.sku}</div>
                </td>
                <td className="px-6 py-5">
                  <span className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded uppercase border border-slate-700">
                    {part.category}
                  </span>
                </td>
                <td className="px-6 py-5 text-right font-mono text-white">${part.price.toFixed(2)}</td>
                <td className="px-6 py-5 text-center">
                  <div className="flex flex-col items-center">
                    <span className={`text-sm font-bold ${part.stock < 10 ? 'text-red-400' : 'text-green-400'}`}>
                      {part.stock} units
                    </span>
                    {part.stock < 10 && (
                      <div className="mt-1 px-2 py-0.5 bg-red-500/10 text-red-500 text-[8px] font-bold rounded uppercase border border-red-500/20 pulse-danger">
                        Low Stock
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="p-2 text-slate-500 hover:text-white transition-all">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-over Panel (Quick Edit) */}
      <div className={`fixed inset-y-0 right-0 w-[450px] bg-[#161E27] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] border-l border-slate-800 transform transition-all duration-500 z-50 ${selectedPart ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedPart && (
          <div className="flex flex-col h-full">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold text-white">Quick Edit Part</h3>
                <p className="text-xs text-slate-500 font-mono uppercase mt-1">{selectedPart.sku}</p>
              </div>
              <button onClick={() => setSelectedPart(null)} className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 p-8 space-y-8 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Unit Price ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                  <input 
                    type="number" 
                    defaultValue={selectedPart.price}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-4 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Inventory Quantity</label>
                <input 
                  type="number" 
                  defaultValue={selectedPart.stock}
                  className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all ${selectedPart.stock < 10 ? 'border-red-500/30' : ''}`}
                />
                {selectedPart.stock < 10 && (
                  <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3">
                    <AlertCircle className="text-red-500 shrink-0" size={18} />
                    <p className="text-xs text-red-200">Current stock is below safety threshold (10 units). This part will be deprioritized in matching logic until replenished.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Status</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-orange-500">
                    <option>Active</option>
                    <option>Flagged</option>
                    <option>Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Lead Time</label>
                  <div className="flex items-center gap-2">
                    <input type="number" defaultValue="1" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white" />
                    <span className="text-xs text-slate-500 font-bold">DAYS</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-800 bg-slate-900/50 flex gap-4">
              <button onClick={() => setSelectedPart(null)} className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-all">
                Cancel
              </button>
              <button className="flex-1 py-4 bg-[#FF6B00] text-white font-bold rounded-xl hover:bg-[#E66000] shadow-[0_0_15px_rgba(255,107,0,0.4)] transition-all">
                Update Record
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManager;
