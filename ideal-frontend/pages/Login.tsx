
import React, { useState } from 'react';
import { Shield, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { Role } from '../types';

interface LoginProps {
  onLogin: (role: Role) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleQuickLogin = (role: Role) => {
    const mockEmails = {
      ADMIN: 'admin@urgentparts.com',
      BUYER: 'procurement@tesla.com',
      SUPPLIER: 'sales@globalparts.com'
    };
    setEmail(mockEmails[role]);
    setPassword('********');
    setTimeout(() => onLogin(role), 500);
  };

  return (
    <div className="flex min-h-screen bg-[#0B1118]">
      {/* Left side: Feature Panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center p-20 relative overflow-hidden bg-slate-900">
        <div className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full bg-[#FF6B00]/10 blur-[120px]" />
        
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded bg-[#FF6B00] flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(255,107,0,0.6)]">
              UP
            </div>
            <span className="text-3xl font-bold tracking-tighter text-white">URGENT<span className="text-[#FF6B00]">PARTS</span></span>
          </div>

          <h1 className="text-6xl font-bold text-white leading-tight mb-6">
            When the line stops, <br />
            <span className="text-[#FF6B00]">we start.</span>
          </h1>
          <p className="text-slate-400 text-xl mb-12 leading-relaxed">
            Proprietary matching engine connecting mission-critical factories with the nearest available precision parts in real-time.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="p-3 bg-orange-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <Zap className="text-[#FF6B00]" size={24} />
              </div>
              <span className="text-lg text-slate-300 font-medium">Real-time supplier matching & dynamic weight routing</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="p-3 bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <Shield className="text-[#007BFF]" size={24} />
              </div>
              <span className="text-lg text-slate-300 font-medium">Full chain of custody & mission-critical verification</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="p-3 bg-green-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <TrendingUp className="text-green-500" size={24} />
              </div>
              <span className="text-lg text-slate-300 font-medium">$45k Avg. hourly downtime saved per deployment</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">System Login</h2>
            <p className="text-slate-500">Access your command center and dispatch parts.</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#161E27] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                placeholder="commander@factory.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Access Token</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#161E27] border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              className="w-full bg-[#FF6B00] hover:bg-[#E66000] text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-[0_0_15px_rgba(255,107,0,0.4)]"
            >
              Authorize Access <ArrowRight size={18} />
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-[#0B1118] text-slate-500">DEMO QUICK LOGIN</span></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <button onClick={() => handleQuickLogin('BUYER')} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700">BUYER</button>
            <button onClick={() => handleQuickLogin('SUPPLIER')} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all border border-slate-700">SUPPLIER</button>
            <button onClick={() => handleQuickLogin('ADMIN')} className="p-3 bg-[#FF6B00]/10 hover:bg-[#FF6B00]/20 text-[#FF6B00] rounded-lg text-xs font-bold transition-all border border-[#FF6B00]/30">ADMIN</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
