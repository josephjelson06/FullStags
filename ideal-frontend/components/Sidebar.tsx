
import React from 'react';
import { 
  Target, 
  Truck, 
  Archive, 
  Plus, 
  Upload, 
  AlertCircle, 
  ClipboardList, 
  History, 
  Bell, 
  BarChart3, 
  FileText, 
  UserCircle
} from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  currentRole: Role;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
}

const Sidebar: React.FC<SidebarProps> = ({ currentRole, activeTab, onTabChange, onLogout, theme }) => {
  const sections = [
    {
      title: 'MATCHING',
      links: [{ id: 'supplier-matches', label: 'My Matches', icon: Target }]
    },
    {
      title: 'ROUTES',
      links: [{ id: 'supplier-routes', label: 'Outgoing Deliveries', icon: Truck }]
    },
    {
      title: 'INVENTORY',
      links: [
        { id: 'inventory', label: 'My Inventory', icon: Archive },
        { id: 'add-part', label: 'Add Part', icon: Plus },
        { id: 'bulk-upload', label: 'Bulk Upload', icon: Upload },
        { id: 'low-stock', label: 'Low Stock Alerts', icon: AlertCircle }
      ]
    },
    {
      title: 'ORDERS',
      links: [
        { id: 'incoming-orders', label: 'Incoming Orders', icon: ClipboardList },
        { id: 'order-history', label: 'Order History', icon: History }
      ]
    },
    {
      title: 'NOTIFICATIONS',
      links: [{ id: 'notifications', label: 'Notifications', icon: Bell }]
    },
    {
      title: 'ANALYTICS',
      links: [
        { id: 'supplier-dashboard', label: 'My Dashboard', icon: BarChart3 },
        { id: 'reports', label: 'Reports', icon: FileText }
      ]
    },
    {
      title: 'ACCOUNT',
      links: [{ id: 'profile', label: 'My Profile', icon: UserCircle }]
    }
  ];

  const sidebarBg = theme === 'dark' ? 'bg-[#0B1118] border-slate-800/50' : 'bg-white border-slate-200';
  const headingColor = theme === 'dark' ? 'text-slate-600' : 'text-slate-400';

  return (
    <div className={`w-64 h-screen border-r flex flex-col fixed left-0 top-0 z-50 transition-colors duration-300 ${sidebarBg}`}>
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className={`text-[10px] font-bold uppercase tracking-widest px-2 mb-2 ${headingColor}`}>
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.links.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onTabChange(link.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-all group relative ${
                    activeTab === link.id 
                      ? (theme === 'dark' ? 'text-white' : 'text-slate-900 bg-slate-50') 
                      : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50')
                  }`}
                >
                  {activeTab === link.id && (
                    <div className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-1 h-5 bg-[#FF6B00] rounded-r shadow-[0_0_10px_rgba(255,107,0,0.8)]" />
                  )}
                  <link.icon 
                    size={16} 
                    className={`${activeTab === link.id ? 'text-[#FF6B00]' : 'text-slate-500 group-hover:text-slate-700'}`} 
                  />
                  <span className="text-xs font-bold">{link.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t border-slate-800/10">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 ${headingColor}`}>
          SUPPLIER PANEL IND
        </span>
      </div>
    </div>
  );
};

export default Sidebar;
