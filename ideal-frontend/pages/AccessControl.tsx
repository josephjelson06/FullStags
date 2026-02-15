
import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Search, ShieldAlert, Key, MoreVertical } from 'lucide-react';
import { MOCK_USERS } from '../constants';
import { User, Role } from '../types';

const AccessControl: React.FC = () => {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRole = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const roles: Role[] = ['ADMIN', 'BUYER', 'SUPPLIER'];
        const nextRole = roles[(roles.indexOf(u.role) + 1) % roles.length];
        return { ...u, role: nextRole };
      }
      return u;
    }));
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldCheck className="text-[#007BFF]" /> Access Control Protocol
          </h1>
          <p className="text-slate-400">Manage user clearance levels and system-wide RBAC permissions.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20">
          <UserPlus size={18} /> Provision New User
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="surface-card p-6 rounded-xl border border-slate-800">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Total Cleared Users</p>
          <p className="text-2xl font-bold text-white">42</p>
        </div>
        <div className="surface-card p-6 rounded-xl border border-slate-800">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Admin Overrides</p>
          <p className="text-2xl font-bold text-[#FF6B00]">3</p>
        </div>
        <div className="surface-card p-6 rounded-xl border border-slate-800">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Session Health</p>
          <p className="text-2xl font-bold text-green-500">100%</p>
        </div>
        <div className="surface-card p-6 rounded-xl border border-slate-800">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Failed Auth Attempts</p>
          <p className="text-2xl font-bold text-red-500">0</p>
        </div>
      </div>

      <div className="surface-card rounded-2xl overflow-hidden border border-slate-800">
        <div className="p-4 bg-slate-800/30 border-b border-slate-700 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Filter identities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none"
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identity</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clearance Level</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organization</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Protocol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-800/20 transition-all group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-slate-400">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{user.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => toggleRole(user.id)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold border flex items-center gap-2 transition-all ${
                    user.role === 'ADMIN' ? 'bg-[#FF6B00]/10 text-[#FF6B00] border-[#FF6B00]/20' :
                    user.role === 'SUPPLIER' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    'bg-slate-700/30 text-slate-400 border-slate-700'
                  }`}>
                    <Key size={10} /> {user.role}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-slate-300">{user.company}</td>
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${
                    user.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-slate-600 hover:text-white transition-all">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-6 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-4">
        <ShieldAlert size={24} className="text-red-500 shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-white mb-1">Critical Security Notice</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Role elevation requires Multi-Factor Authentication (MFA) override. Any changes to Clearance Levels are logged in the <strong>Immutable Audit Trail</strong> and will trigger a high-priority system notification to the Platform Security Officer.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessControl;
