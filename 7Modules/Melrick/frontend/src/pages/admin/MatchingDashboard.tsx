import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

import {
  fetchPlacedOrders,
  getMatchLogs,
  getMatchingConfig,
  runOrderMatching,
  updateMatchingConfig,
} from "../../api/client";
import type {
  MatchLogEntry,
  MatchResult,
  OrderSummary,
  WeightProfile,
  WeightProfiles,
} from "../../types/matching";

const SCORE_LABELS: Array<{ key: keyof WeightProfile; label: string; color: string }> = [
  { key: "distance", label: "Distance", color: "#2176ff" },
  { key: "reliability", label: "Reliability", color: "#1e9e59" },
  { key: "price", label: "Price", color: "#d48f13" },
  { key: "urgency", label: "Urgency", color: "#d64343" },
];

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const formatScore = (value: number) => value.toFixed(2);

const ScoreBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="score-bar">
    <div className="score-bar__label">
      <span>{label}</span>
      <strong>{formatScore(value)}</strong>
    </div>
    <div className="score-bar__track">
      <div className="score-bar__fill" style={{ width: `${Math.min(1, value) * 100}%`, background: color }} />
    </div>
  </div>
);

const MatchingDashboard = () => {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [matchingResults, setMatchingResults] = useState<MatchResult[]>([]);
  const [logs, setLogs] = useState<MatchLogEntry[]>([]);
  const [selectedLogItemId, setSelectedLogItemId] = useState<number | null>(null);
  const [weights, setWeights] = useState<WeightProfiles>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<string | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const refreshOrders = useCallback(async () => {
    const orderList = await fetchPlacedOrders();
    setOrders(orderList);
    setSelectedOrderId((prev) => prev ?? orderList[0]?.id ?? null);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [configResponse] = await Promise.all([
          getMatchingConfig(),
          refreshOrders(),
        ]);
        setWeights(configResponse.weight_profiles);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    loadData();
  }, [refreshOrders]);

  useEffect(() => {
    const firstItemId = selectedOrder?.items[0]?.id ?? null;
    setSelectedLogItemId(firstItemId);
    setLogs([]);
  }, [selectedOrder]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!selectedLogItemId) {
        return;
      }

      try {
        const data = await getMatchLogs(selectedLogItemId);
        setLogs(data);
      } catch (err) {
        setError((err as Error).message);
      }
    };

    fetchLogs();
  }, [selectedLogItemId]);

  useEffect(() => {
    const socket = io(API_BASE, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socket.on("event", async (event) => {
      if (event?.event_type !== "SUPPLIER_MATCHED") {
        return;
      }

      const payloadOrderId = Number(event?.payload?.order_id ?? 0);
      if (!selectedOrderId || payloadOrderId !== selectedOrderId) {
        return;
      }

      try {
        await refreshOrders();
        if (selectedLogItemId) {
          const updatedLogs = await getMatchLogs(selectedLogItemId);
          setLogs(updatedLogs);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    });

    return () => {
      socket.close();
    };
  }, [refreshOrders, selectedLogItemId, selectedOrderId]);

  const handleRunMatching = async () => {
    if (!selectedOrderId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await runOrderMatching(selectedOrderId);
      setMatchingResults(results);
      await refreshOrders();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (urgency: string, key: keyof WeightProfile, value: number) => {
    setWeights((prev) => {
      const current = prev[urgency] ?? { distance: 0.25, reliability: 0.25, price: 0.25, urgency: 0.25 };
      const clamped = Math.max(0, Math.min(1, value));
      const otherKeys = (Object.keys(current) as Array<keyof WeightProfile>).filter((k) => k !== key);
      const otherTotal = otherKeys.reduce((sum, k) => sum + current[k], 0);
      const remaining = Math.max(0, 1 - clamped);

      const updated: WeightProfile = { ...current, [key]: clamped };

      if (otherTotal <= 0) {
        const even = remaining / otherKeys.length;
        otherKeys.forEach((otherKey) => {
          updated[otherKey] = even;
        });
      } else {
        otherKeys.forEach((otherKey) => {
          updated[otherKey] = (current[otherKey] / otherTotal) * remaining;
        });
      }

      return { ...prev, [urgency]: updated };
    });
  };

  const handleSaveConfig = async () => {
    setConfigStatus(null);
    try {
      await updateMatchingConfig(weights);
      setConfigStatus("Weights saved.");
    } catch (err) {
      setConfigStatus((err as Error).message);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="eyebrow">Module 2</p>
          <h1>Supplier Matching Dashboard</h1>
          <p className="subtitle">Trigger matching, review scores, and tune urgency profiles.</p>
        </div>
        <div className="status-pill">
          <span>Orders in queue</span>
          <strong>{orders.length}</strong>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <section className="grid">
        <div className="card">
          <h2>Trigger Matching</h2>
          <p className="hint">Select a PLACED order and run matching to generate top suppliers per item.</p>
          <div className="field">
            <label>Order</label>
            <select
              value={selectedOrderId ?? ""}
              onChange={(event) => setSelectedOrderId(Number(event.target.value))}
            >
              <option value="" disabled>
                Select an order
              </option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  #{order.id} | {order.urgency.toUpperCase()} | {order.items.length} items
                </option>
              ))}
            </select>
          </div>
          <button className="primary" onClick={handleRunMatching} disabled={!selectedOrderId || loading}>
            {loading ? "Running..." : "Run Matching"}
          </button>
          {selectedOrder && (
            <div className="order-meta">
              <span>Status: {selectedOrder.status}</span>
              <span>Required by: {selectedOrder.required_delivery_date ?? "n/a"}</span>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Match Logs</h2>
          <p className="hint">Audit every supplier considered for a specific order item.</p>
          <div className="field">
            <label>Order Item</label>
            <select
              value={selectedLogItemId ?? ""}
              onChange={(event) => setSelectedLogItemId(Number(event.target.value))}
            >
              <option value="" disabled>
                Select an order item
              </option>
              {selectedOrder?.items.map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.id} | {item.part_number} | Qty {item.quantity}
                </option>
              ))}
            </select>
          </div>
          <div className="table">
            <div className="table__head">
              <span>Rank</span>
              <span>Supplier</span>
              <span>Total</span>
              <span>Distance</span>
              <span>Reliability</span>
              <span>Price</span>
              <span>Urgency</span>
            </div>
            {logs.length === 0 && <p className="empty">No logs yet.</p>}
            {logs.map((entry) => (
              <div className="table__row" key={entry.id}>
                <span>{entry.rank}</span>
                <span>Supplier {entry.supplier_id}</span>
                <span>{formatScore(entry.total_score)}</span>
                <span>{formatScore(entry.distance_score)}</span>
                <span>{formatScore(entry.reliability_score)}</span>
                <span>{formatScore(entry.price_score)}</span>
                <span>{formatScore(entry.urgency_score)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card full">
        <h2>Matching Results</h2>
        <p className="hint">Top three suppliers per order item with sub-score breakdown.</p>
        {matchingResults.length === 0 && <p className="empty">Run matching to see results.</p>}
        {matchingResults.map((result) => (
          <div key={result.order_item_id} className="result">
            <h3>Order Item #{result.order_item_id}</h3>
            <div className="result__table">
              {result.top_matches.map((match) => (
                <div
                  key={`${result.order_item_id}-${match.supplier_id}`}
                  className={`result__row ${
                    match.supplier_id === result.selected_supplier_id ? "selected" : ""
                  }`}
                >
                  <div className="result__summary">
                    <div>
                      <strong>{match.business_name}</strong>
                      <span>{match.catalog_entry.part_number}</span>
                    </div>
                    <div className="result__score">
                      <span>Total</span>
                      <strong>{formatScore(match.total_score)}</strong>
                    </div>
                  </div>
                  <div className="result__bars">
                    <ScoreBar label="Distance" value={match.distance_score} color="#2176ff" />
                    <ScoreBar label="Reliability" value={match.reliability_score} color="#1e9e59" />
                    <ScoreBar label="Price" value={match.price_score} color="#d48f13" />
                    <ScoreBar label="Urgency" value={match.urgency_score} color="#d64343" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="card full">
        <h2>Weight Configuration</h2>
        <p className="hint">Adjust weights per urgency tier. Sliders are linked to keep the total at 1.0.</p>
        <div className="weights-grid">
          {Object.entries(weights).map(([urgency, profile]) => (
            <div key={urgency} className="weight-card">
              <div className="weight-card__header">
                <h3>{urgency.toUpperCase()}</h3>
                <span className="pill">
                  Total {formatScore(profile.distance + profile.reliability + profile.price + profile.urgency)}
                </span>
              </div>
              {SCORE_LABELS.map(({ key, label }) => (
                <div className="slider" key={`${urgency}-${key}`}>
                  <div className="slider__label">
                    <span>{label}</span>
                    <strong>{formatScore(profile[key])}</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={profile[key]}
                    onChange={(event) => handleWeightChange(urgency, key, Number(event.target.value))}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="primary" onClick={handleSaveConfig}>
            Save Config
          </button>
          {configStatus && <span className="status">{configStatus}</span>}
        </div>
      </section>
    </div>
  );
};

export default MatchingDashboard;
