
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  color?: 'orange' | 'blue' | 'green' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, trend, color = 'orange' }) => {
  const colorMap = {
    orange: 'border-orange-500/30 text-orange-500 shadow-orange-500/10',
    blue: 'border-blue-500/30 text-blue-500 shadow-blue-500/10',
    green: 'border-green-500/30 text-green-500 shadow-green-500/10',
    purple: 'border-purple-500/30 text-purple-500 shadow-purple-500/10',
  };

  return (
    <div className={`surface-card p-6 rounded-xl border-l-4 ${colorMap[color]} transition-all hover:translate-y-[-2px]`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-800/50 rounded-lg">
          <Icon size={20} />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend.positive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {trend.value}
          </span>
        )}
      </div>
      <h3 className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">{label}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
};

export default StatCard;
