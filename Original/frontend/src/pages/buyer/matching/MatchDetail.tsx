import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMatches, updateOrder } from '@/services/api/orders';

interface Match { id: number; supplier_name: string; unit_price: number; distance_km: number; reliability_score: number; lead_time_hours: number; composite_score: number; }

export function MatchDetail() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMatches(matchId!);
        setMatches(data as unknown as Match[]);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    load();
  }, [matchId]);

  const accept = async (mId: number) => {
    setAccepting(mId);
    try {
      await updateOrder(matchId!, 'select_supplier', String(mId));
      navigate('/buyer/orders');
    } catch { setAccepting(null); }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading matches...</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline">← Back</button>
      <h1 className="text-2xl font-bold">Matches for Order #{matchId}</h1>
      <p className="text-sm text-gray-500">{matches.length} supplier{matches.length !== 1 ? 's' : ''} matched</p>

      {matches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No matches found. The matching engine may not have run yet.</div>
      ) : (
        <div className="space-y-3">
          {matches.map((m, i) => (
            <div key={m.id} className={`rounded-lg border p-5 ${i === 0 ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs text-white font-medium">Best Match</span>}
                  <h3 className="font-semibold text-lg">{m.supplier_name}</h3>
                </div>
                <button
                  onClick={() => void accept(m.id)}
                  disabled={accepting !== null}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {accepting === m.id ? 'Accepting...' : 'Accept'}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-500 block text-xs uppercase">Price</span>₹{m.unit_price?.toFixed(2) ?? '—'}</div>
                <div><span className="text-gray-500 block text-xs uppercase">Distance</span>{m.distance_km?.toFixed(1) ?? '—'} km</div>
                <div><span className="text-gray-500 block text-xs uppercase">Reliability</span>{((m.reliability_score ?? 0) * 100).toFixed(0)}%</div>
                <div><span className="text-gray-500 block text-xs uppercase">Score</span><span className="text-lg font-bold text-blue-600">{(m.composite_score ?? 0).toFixed(2)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
