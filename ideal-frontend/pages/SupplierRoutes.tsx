
import React from 'react';
import { Truck, Clock, Navigation, ShieldCheck, MapPin, Search } from 'lucide-react';

const SupplierRoutes: React.FC = () => {
  const routes = [
    { id: 'UP-8821', courier: 'FlashLogistics', status: 'In-Transit', eta: '12 mins', destination: 'Tesla Giga-Factory' },
    { id: 'UP-8904', courier: 'RapidShip', status: 'Picking', eta: '3 mins', destination: 'SpaceX Starbase' }
  ];

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Logistics Command</h1>
        <p className="text-slate-400">Real-time telemetry for all outgoing industrial shipments.</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
        <div className="lg:col-span-2 relative bg-[#161E27]/50 border border-slate-800 rounded-3xl overflow-hidden flex items-center justify-center shadow-inner">
           {/* CSS Map Placeholder */}
           <div className="absolute inset-0 opacity-10 pointer-events-none">
             <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid-map" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#2D3748" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-map)" />
             </svg>
           </div>

           <div className="relative w-full h-full max-w-2xl flex items-center justify-center">
              <svg viewBox="0 0 600 400" className="w-full h-auto">
                 <path d="M100 200 Q300 100 500 200" stroke="#2D3748" strokeWidth="2" strokeDasharray="5,5" fill="none" />
                 <path d="M100 200 Q300 300 500 200" stroke="#2D3748" strokeWidth="2" strokeDasharray="5,5" fill="none" />
                 
                 {/* Courier A Pulsing */}
                 <g className="animate-pulse">
                   <circle cx="220" cy="160" r="6" fill="#FF6B00" />
                   <circle cx="220" cy="160" r="12" stroke="#FF6B00" strokeWidth="1" fill="none" />
                 </g>
                 <text x="210" y="140" fill="#FF6B00" fontSize="10" fontWeight="bold">FLASH-8821</text>

                 {/* Courier B Pulsing */}
                 <g className="animate-pulse">
                   <circle cx="450" cy="225" r="6" fill="#007BFF" />
                   <circle cx="450" cy="225" r="12" stroke="#007BFF" strokeWidth="1" fill="none" />
                 </g>
                 <text x="440" y="210" fill="#007BFF" fontSize="10" fontWeight="bold">RAPID-8904</text>

                 <circle cx="100" cy="200" r="8" fill="#FF6B00" />
                 <text x="80" y="230" fill="white" fontSize="10" fontWeight="bold">WAREHOUSE</text>
                 
                 <circle cx="500" cy="200" r="8" fill="#007BFF" />
                 <text x="480" y="230" fill="white" fontSize="10" fontWeight="bold">FACTORY HUB</text>
              </svg>
           </div>

           <div className="absolute top-6 left-6 flex gap-4">
              <div className="bg-slate-900/80 border border-slate-700 px-4 py-2 rounded-lg text-[10px] font-bold text-white flex items-center gap-2 backdrop-blur-md">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> SAT-LINK ACTIVE
              </div>
           </div>
        </div>

        <div className="space-y-4 overflow-y-auto pr-2">
           <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Live Shipments</h2>
           {routes.map(route => (
             <div key={route.id} className="surface-card p-6 rounded-2xl border border-slate-800 bg-[#161E27]/40 hover:bg-[#161E27] transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded mb-2 inline-block">#{route.id}</span>
                      <h3 className="text-sm font-bold text-white">{route.destination}</h3>
                   </div>
                   <div className="text-right">
                      <p className="text-lg font-bold text-white flex items-center gap-1 justify-end"><Clock size={16} className="text-slate-500" /> {route.eta}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">ETA</p>
                   </div>
                </div>
                
                <div className="space-y-3">
                   <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Courier</span>
                      <span className="text-white font-medium">{route.courier}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Status</span>
                      <span className={`font-bold ${route.status === 'In-Transit' ? 'text-blue-400' : 'text-orange-400'}`}>{route.status.toUpperCase()}</span>
                   </div>
                </div>

                <div className="mt-6 flex gap-2">
                   <button className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300">DETAILS</button>
                   <button className="flex-1 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg text-[10px] font-bold">CONTACT</button>
                </div>
             </div>
           ))}
           
           <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center gap-4 mt-8">
              <ShieldCheck className="text-blue-500" size={24} />
              <p className="text-xs text-slate-400 leading-tight">All couriers are <span className="text-white font-bold">UP-Verified</span> for mission-critical chain of custody.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierRoutes;
