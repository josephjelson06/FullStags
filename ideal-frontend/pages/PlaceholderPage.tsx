
import React from 'react';
import { Construction, Target, Truck, Archive, ClipboardList, Bell, BarChart3, UserCircle, Upload } from 'lucide-react';

interface PlaceholderProps {
  module: string;
  title: string;
  description: string;
  icon: 'MATCH' | 'ROUTE' | 'INV' | 'ORDER' | 'NOTIF' | 'CHART' | 'PROFILE';
  emptyState?: boolean;
}

const PlaceholderPage: React.FC<PlaceholderProps> = ({ module, title, description, icon, emptyState }) => {
  const IconMap = {
    MATCH: Target,
    ROUTE: Truck,
    INV: Archive,
    ORDER: ClipboardList,
    NOTIF: Bell,
    CHART: BarChart3,
    PROFILE: UserCircle
  };

  const Icon = IconMap[icon];

  if (emptyState) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
        <p className="text-slate-400 text-sm mb-12">{description}</p>
        
        <div className="h-[400px] rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center p-12 text-center bg-[#161E27]/20">
          <div className="w-12 h-12 bg-slate-800/50 rounded-lg flex items-center justify-center mb-6 border border-slate-700">
            <Upload className="text-slate-500" size={20} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No incoming supplier orders</h2>
          <p className="text-slate-500 max-w-sm text-sm">New urgent requests assigned to your warehouse will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center px-10 text-center bg-[#0B1118]">
      <div className="w-16 h-16 bg-slate-800/40 rounded-xl flex items-center justify-center mb-8 border border-slate-700/50">
        <Construction className="text-blue-400/80" size={32} />
      </div>

      <div className="inline-block px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-bold rounded-full uppercase tracking-widest mb-6">
        MODULE: {module}
      </div>

      <h2 className="text-3xl font-bold text-white mb-4">{title}</h2>
      <p className="text-slate-500 max-w-xl text-base leading-relaxed mb-12">
        {description}
      </p>

      <div className="surface-card px-10 py-4 rounded-xl border border-dashed border-slate-700 text-slate-600 text-sm italic bg-[#161E27]/30">
        This page is ready to be implemented. Replace this component with the real module.
      </div>
    </div>
  );
};

export default PlaceholderPage;
