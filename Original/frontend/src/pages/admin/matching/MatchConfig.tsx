import { useEffect, useState } from 'react';
import {
  getMatchConfig,
  updateMatchConfig,
  getPlacedOrders,
  runOrderMatching,
  type MatchConfig,
} from '@/services/api/matching';

export function MatchConfig() {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [placedOrders, setPlacedOrders] = useState<{ id: number; urgency: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [matchingOrderId, setMatchingOrderId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [cfg, orders] = await Promise.all([getMatchConfig(), getPlacedOrders()]);
        setConfig(cfg);
        setPlacedOrders(orders as { id: number; urgency: string; status: string }[]);
      } catch {
        setMessage('Failed to load config');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleWeightChange = (urgency: string, field: string, value: string) => {
    if (!config) return;
    const numVal = parseFloat(value) || 0;
    setConfig({
      ...config,
      weight_profiles: {
        ...config.weight_profiles,
        [urgency]: { ...config.weight_profiles[urgency], [field]: numVal },
      },
    });
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateMatchConfig(config);
      setConfig(updated);
      setMessage('Configuration saved successfully');
    } catch {
      setMessage('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const runMatch = async (orderId: number) => {
    setMatchingOrderId(orderId);
    setMessage(null);
    try {
      const results = await runOrderMatching(orderId);
      setMessage(`Matched order #${orderId}: ${results.length} items matched`);
      const orders = await getPlacedOrders();
      setPlacedOrders(orders as { id: number; urgency: string; status: string }[]);
    } catch {
      setMessage(`Failed to match order #${orderId}`);
    } finally {
      setMatchingOrderId(null);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading configuration...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Matching Configuration</h1>
      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.includes('Failed') ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
          {message}
        </div>
      )}

      {config && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-4">Weight Profiles</h2>
          <p className="text-sm text-gray-500 mb-4">Each urgency tier's weights must sum to 1.0</p>
          <div className="space-y-4">
            {Object.entries(config.weight_profiles).map(([urgency, weights]) => (
              <div key={urgency} className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                <div className="font-medium capitalize mb-3">{urgency}</div>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(weights).map(([field, val]) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1 capitalize">{field.replace('_', ' ')}</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={val}
                        onChange={(e) => handleWeightChange(urgency, field, e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Sum: {Object.values(weights).reduce((a, b) => a + b, 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold mb-4">Run Matching</h2>
        {placedOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders in PLACED status.</p>
        ) : (
          <div className="space-y-2">
            {placedOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <div>
                  <span className="font-medium">Order #{order.id}</span>
                  <span className="ml-2 text-sm text-gray-500 capitalize">{order.urgency}</span>
                </div>
                <button
                  className="rounded bg-orange-100 px-3 py-1 text-sm text-orange-700 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 disabled:opacity-50"
                  onClick={() => void runMatch(order.id)}
                  disabled={matchingOrderId === order.id}
                >
                  {matchingOrderId === order.id ? 'Matching...' : 'Run Match'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
