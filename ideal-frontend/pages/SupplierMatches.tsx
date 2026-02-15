
import React from 'react';
import { Target, Zap, CheckCircle2, TrendingUp, Search } from 'lucide-react';
import { MOCK_MATCHES } from '../constants';

const SupplierMatches: React.FC = () => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Matching Engine Intelligence</h1>
        <p className="text-slate-400">Detailed breakdown of active buyer search wins and placement analytics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Recent Match Victories</h2>
          {MOCK_MATCHES.map((match, i) => (
            <div key={i} className="surface-card p-6 rounded-2xl border border-slate-800 hover:border-orange-500/40 transition-all bg-[#161E27]/40 group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-black rounded uppercase">RANK #{match.rank}</span>
                    <span className="text-xs font-mono text-slate-500">Match Confidence: {match.score}%</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-orange-400 transition-colors italic">"{match.query}"</h3>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 shadow-inner">
                  <Target className="text-orange-500" size={20} />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Why You Matched</p>
                <div className="flex flex-wrap gap-2">
                  {match.reasons.map((r, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-500/5 text-blue-400 border border-blue-500/10 rounded-full text-[10px] font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={10} /> {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="surface-card p-8 rounded-2xl bg-orange-500/5 border border-orange-500/10 glow-orange">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <TrendingUp className="text-orange-500" size={24} /> Performance Insights
            </h3>
            <div className="space-y-8">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-400">Search Visibility</span>
                  <span className="text-sm font-bold text-white">92nd Percentile</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 w-[92%] shadow-[0_0_10px_rgba(255,107,0,0.5)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Impressions</p>
                  <p className="text-2xl font-bold text-white">12,402</p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold text-green-400">4.8%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-card p-8 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">Market Opportunity</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              There is a <span className="text-orange-500 font-bold">15% spike</span> in demand for <span className="text-white font-bold">Pneumatic Sensors</span> in your delivery radius. Adjust inventory weights to capture more matching traffic.
            </p>
            <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2">
              <Search size={16} /> ANALYZE COMPETITION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierMatches;
