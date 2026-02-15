import { useState } from 'react';
import {
  getMatchingLogs,
  type MatchLogEntry,
} from '@/services/api/matching';

export function MatchLogs() {
  const [itemId, setItemId] = useState('');
  const [logs, setLogs] = useState<MatchLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const id = parseInt(itemId, 10);
    if (!id || id <= 0) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await getMatchingLogs(id);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Matching Logs</h1>

      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Item ID</label>
          <input
            type="number"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            placeholder="e.g. 1"
            className="rounded-lg  px-3 py-2 text-sm"
          />
        </div>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => void search()}
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : searched && logs.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No matching logs found for item #{itemId}.</div>
      ) : logs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border ">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">Distance</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">Reliability</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-400">Lead Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-transparent">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-sm font-medium">#{log.rank}</td>
                  <td className="px-4 py-3 text-sm">{log.supplier_name}</td>
                  <td className="px-4 py-3 text-sm font-medium">{log.score.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm">{log.price_score.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm">{log.distance_score.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm">{log.reliability_score.toFixed(3)}</td>
                  <td className="px-4 py-3 text-sm">{log.lead_time_score.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
