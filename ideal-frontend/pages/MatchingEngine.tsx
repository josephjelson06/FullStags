
import React, { useState, useEffect } from 'react';
import { Settings, Cpu, ChevronRight, CheckCircle2 } from 'lucide-react';
import { MOCK_SUPPLIERS } from '../constants';
import { Supplier } from '../types';

const MatchingEngine: React.FC = () => {
  const [weights, setWeights] = useState({
    price: 30,
    distance: 40,
    rating: 20,
    stock: 10
  });

  const [simulatedSuppliers, setSimulatedSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);

  useEffect(() => {
    // Simulation logic: Re-calculate match score and sort
    const calculateScore = (s: Supplier) => {
      // Very rough mock calculation
      const pScore = (1000 / (s.distance + 1)) * (weights.price / 100);
      const dScore = (100 / (s.distance + 1)) * (weights.distance / 100);
      const rScore = s.rating * 20 * (weights.rating / 100);
      const sScore = s.stockAvailability * (weights.stock / 100);
      return Math.round(pScore + dScore + rScore + sScore);
    };

    const updated = MOCK_SUPPLIERS.map(s => ({
      ...s,
      matchScore: calculateScore(s)
    })).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    setSimulatedSuppliers(updated);
  }, [weights]);

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Cpu className="text-[#FF6B00]" /> Matching Engine Configuration
        </h1>
        <p className="text-slate-400">Calibrate the matching algorithm weights for emergency dispatch logic.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sliders Panel */}
        <div className="surface-card p-8 rounded-2xl glow-orange">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings size={20} className="text-slate-500" /> Weight Calibration
            </h2>
            <div className="px-3 py-1 bg-orange-500/10 text-[#FF6B00] text-xs font-bold rounded-full border border-orange-500/20">
              {/* Fix: Cast Object.values to number array to resolve unknown type error in reduce */}
              {(Object.values(weights) as number[]).reduce((a, b) => a + b, 0)}% TOTAL
            </div>
          </div>

          <div className="space-y-10">
            {Object.entries(weights).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between mb-4">
                  <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">{key}</label>
                  <span className="text-[#FF6B00] font-mono font-bold">{val}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={val}
                  onChange={(e) => handleWeightChange(key as any, parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
                />
              </div>
            ))}
          </div>

          <div className="mt-12 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <Settings size={18} className="text-[#007BFF]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">Adaptive Learning Enabled</p>
              <p className="text-xs text-slate-400">Weights are currently overriding neural defaults. Use 'Simulation Mode' to verify before committing to production.</p>
            </div>
          </div>
        </div>

        {/* Live Simulation Panel */}
        <div className="surface-card p-8 rounded-2xl bg-slate-900/50">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            Live Ranking Simulation
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2" />
          </h2>

          <div className="space-y-4">
            {simulatedSuppliers.map((s, index) => (
              <div 
                key={s.id} 
                className={`p-4 rounded-xl border transition-all duration-500 flex items-center justify-between ${
                  index === 0 ? 'bg-orange-500/5 border-orange-500/30' : 'bg-slate-800/40 border-slate-700/50'
                }`}
                style={{
                  transform: `translateY(${index * 5}px)`
                }}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    index === 0 ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{s.name}</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{s.distance}km away • {s.rating}★ Rating</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400 mb-1">MATCH SCORE</div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${index === 0 ? 'bg-[#FF6B00]' : 'bg-[#007BFF]'}`}
                        style={{ width: `${Math.min(100, (s.matchScore || 0) / 2)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-mono font-bold ${index === 0 ? 'text-[#FF6B00]' : 'text-[#007BFF]'}`}>
                      {s.matchScore}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
            Commit Weight Changes <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchingEngine;
