import { useEffect, useState } from 'react';
import { request } from '@/services/api/client';
import { getMatchingLogs, type MatchLogEntry } from '@/services/api/matching';

interface Assignment { id: number; order_item_id: number; status: string; unit_price: number; }

export function MyMatches() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [logs, setLogs] = useState<MatchLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await request<Assignment[]>('/api/matching/my-assignments');
        setAssignments(data);
      } catch { /* endpoint may not exist, show empty */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const viewLogs = async (itemId: number) => {
    setSelectedItem(itemId);
    try { const data = await getMatchingLogs(itemId); setLogs(data); }
    catch { setLogs([]); }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading matches...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Matches</h1>

      {assignments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â</div>
          <p>No matches assigned to you yet.</p>
          <p className="text-sm text-gray-400 mt-1">You will see orders here when the matching engine pairs you with buyer requests.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border ">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Assignment</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Order Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-transparent">
              {assignments.map(a => (
                <tr key={a.id}>
                  <td className="px-6 py-4 text-sm font-medium">#{a.id}</td>
                  <td className="px-6 py-4 text-sm">#{a.order_item_id}</td>
                  <td className="px-6 py-4 text-sm">ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹{a.unit_price?.toFixed(2) ?? 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${a.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : a.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{a.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button onClick={() => void viewLogs(a.order_item_id)} className="text-blue-600 hover:underline text-xs">View Scores</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedItem !== null && (
        <div className="surface-card rounded-2xl p-6">
          <h2 className="font-semibold mb-3">Match Scores for Item #{selectedItem}</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400">No scoring logs available.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(l => (
                <div key={l.id} className="flex items-center justify-between rounded bg-gray-50 px-4 py-2">
                  <span className="font-medium text-sm">{l.supplier_name}</span>
                  <span className="text-sm text-blue-600 font-bold">{l.score.toFixed(3)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
