
import React from 'react';
import { UserCircle, MapPin, ShieldCheck, Mail, Phone, Factory, CreditCard, Save, Star, BadgeCheck } from 'lucide-react';

const Profile: React.FC = () => {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-slate-800 rounded-3xl border border-slate-700 flex items-center justify-center text-[#FF6B00] font-black text-3xl shadow-2xl relative">
             FP
             <div className="absolute -bottom-2 -right-2 bg-green-500 p-1.5 rounded-full border-4 border-[#0B1118]">
                <BadgeCheck className="text-white" size={16} />
             </div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white">FastParts Distribution</h1>
              <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 text-[10px] font-black rounded-md border border-orange-500/20 tracking-tighter uppercase">Certified Emergency Supplier</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-yellow-500 font-bold">
                <Star size={16} fill="currentColor" /> 4.9 <span className="text-slate-500 font-normal ml-1">(1,240 audits)</span>
              </div>
              <div className="w-1 h-1 bg-slate-700 rounded-full" />
              <p className="text-slate-400">Platform ID: FP-842-SD-ALPHA</p>
            </div>
          </div>
        </div>
        <button className="px-8 py-3 bg-[#FF6B00] text-white font-bold rounded-xl flex items-center gap-2 shadow-xl shadow-orange-500/30 hover:bg-orange-600 transition-all transform active:scale-95">
          <Save size={18} /> SAVE PROTOCOL
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="surface-card p-8 rounded-3xl border border-slate-800 bg-[#161E27]/40">
            <h3 className="font-bold text-white mb-8 border-b border-slate-800 pb-4 uppercase tracking-widest text-xs">Organization Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Legal Name</label>
                <input type="text" defaultValue="FastParts Distribution Inc." className="w-full bg-[#0B1118]/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tax Authority ID</label>
                <input type="text" defaultValue="EIN-98-1029384" className="w-full bg-[#0B1118]/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-orange-500 outline-none" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin Contact Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input type="email" defaultValue="logistics@fastparts.io" className="w-full bg-[#0B1118]/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Emergency Hotline</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                  <input type="text" defaultValue="+1 (800) URGENT-PT" className="w-full bg-[#0B1118]/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white font-bold" />
                </div>
              </div>
            </div>
          </div>

          <div className="surface-card p-8 rounded-3xl border border-slate-800 bg-[#161E27]/40">
            <h3 className="font-bold text-white mb-8 border-b border-slate-800 pb-4 uppercase tracking-widest text-xs">Logistics Topology</h3>
            <div className="space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Command Warehouse Hub</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 text-slate-600" size={18} />
                    <textarea defaultValue="Industrial Complex 7, Hub B&#10;102 Logistics Pkwy&#10;Chicago, IL 60601" className="w-full bg-[#0B1118]/50 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-sm text-white h-32 outline-none" />
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Service Radius</label>
                    <div className="flex items-end gap-3">
                       <input type="number" defaultValue="150" className="w-full bg-[#0B1118] border border-slate-700 rounded-xl px-4 py-3 text-2xl font-bold text-white" />
                       <span className="text-xs font-bold text-slate-500 mb-4 uppercase">KM</span>
                    </div>
                 </div>
                 <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Target Pick Time</label>
                    <div className="flex items-end gap-3">
                       <input type="number" defaultValue="18" className="w-full bg-[#0B1118] border border-slate-700 rounded-xl px-4 py-3 text-2xl font-bold text-orange-500" />
                       <span className="text-xs font-bold text-slate-500 mb-4 uppercase">MIN</span>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="surface-card p-8 rounded-3xl border border-slate-800 bg-slate-900/50 text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
              <div className="w-20 h-20 bg-slate-800 rounded-2xl mx-auto mb-6 flex items-center justify-center border border-slate-700 text-slate-400">
                 <Factory size={32} />
              </div>
              <h3 className="font-bold text-white text-lg">Supply Chain Grade</h3>
              <p className="text-xs text-orange-500 font-black uppercase tracking-widest mb-6">Tier 1 Strategic Hub</p>
              
              <div className="space-y-4 mb-8">
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Security Clearance</span>
                    <span className="text-green-500 font-bold">LEVEL 4</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Audit Status</span>
                    <span className="text-blue-400 font-bold">VERIFIED</span>
                 </div>
              </div>
              
              <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-700 transition-all">
                REQUEST RE-AUDIT
              </button>
           </div>

           <div className="surface-card p-8 rounded-3xl border border-slate-800">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                <CreditCard size={18} className="text-blue-500" /> Remittance Node
              </h3>
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl mb-6">
                 <p className="text-[10px] text-slate-500 mb-1 font-black uppercase tracking-tighter">Primary Dispatch Account</p>
                 <p className="text-sm font-mono text-white tracking-widest">CHASE-••••-9920</p>
              </div>
              <button className="w-full py-3 text-xs font-bold text-blue-400 hover:text-blue-300 transition-all border border-blue-500/20 rounded-xl hover:bg-blue-500/5">
                MANAGE PAYMENTS
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
