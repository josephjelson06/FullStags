import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

import {
  createBatchDelivery,
  createSingleDelivery,
  fetchAvailableAssignments,
  fetchDeliveries,
  fetchDeliveryStats,
} from "../../api/client";
import type {
  AvailableAssignment,
  DeliveryResponse,
  DeliveryStats,
  VRPBatchResult,
} from "../../types/delivery";

const COLORS = ["#0055c7", "#1e9e59", "#d48f13", "#d64343", "#6d28d9", "#0f766e"];

const RouteBounds = ({ points }: { points: Array<[number, number]> }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [28, 28] });
    }
  }, [map, points]);
  return null;
};

const DeliveryDashboard = () => {
  const [availableAssignments, setAvailableAssignments] = useState<AvailableAssignment[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryResponse[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [lastBatchResult, setLastBatchResult] = useState<VRPBatchResult | null>(null);

  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>([]);
  const [deliveryMode, setDeliveryMode] = useState<"single" | "batched">("single");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRoutePoints = useMemo(() => {
    const points: Array<[number, number]> = [];
    deliveries.forEach((delivery) => {
      const coordinates = delivery.route_geometry?.coordinates ?? [];
      coordinates.forEach((coordinate) => {
        points.push([coordinate[1], coordinate[0]]);
      });
    });
    return points;
  }, [deliveries]);

  const refreshData = async () => {
    const [assignments, deliveryList, statsResponse] = await Promise.all([
      fetchAvailableAssignments(),
      fetchDeliveries(),
      fetchDeliveryStats(),
    ]);
    setAvailableAssignments(assignments);
    setDeliveries(deliveryList);
    setStats(statsResponse);
  };

  useEffect(() => {
    refreshData().catch((err) => setError((err as Error).message));
  }, []);

  const onSelectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(event.target.selectedOptions).map((option) => Number(option.value));
    setSelectedAssignmentIds(selected);
  };

  const handleOptimize = async () => {
    setError(null);
    if (selectedAssignmentIds.length === 0) {
      setError("Select at least one confirmed assignment.");
      return;
    }
    if (deliveryMode === "single" && selectedAssignmentIds.length !== 1) {
      setError("Single delivery mode requires exactly one assignment.");
      return;
    }
    if (deliveryMode === "batched" && selectedAssignmentIds.length < 2) {
      setError("Batch mode requires at least two assignments.");
      return;
    }

    setBusy(true);
    try {
      if (deliveryMode === "single") {
        const delivery = await createSingleDelivery(selectedAssignmentIds[0]);
        setLastBatchResult({
          deliveries_created: [delivery],
          total_savings_km: 0,
          total_savings_percent: 0,
        });
      } else {
        const result = await createBatchDelivery(selectedAssignmentIds);
        setLastBatchResult(result);
      }
      setSelectedAssignmentIds([]);
      await refreshData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page delivery-page">
      <header className="page__header">
        <div>
          <p className="eyebrow">Module 3</p>
          <h1>Delivery Optimization Dashboard</h1>
          <p className="subtitle">Create single routes or run VRP batching for confirmed assignments.</p>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <section className="grid">
        <div className="card">
          <h2>Create Delivery</h2>
          <p className="hint">Choose confirmed assignments not yet planned for delivery.</p>

          <div className="field">
            <label>Mode</label>
            <div className="toggle-row">
              <button
                className={`ghost ${deliveryMode === "single" ? "active" : ""}`}
                onClick={() => setDeliveryMode("single")}
              >
                Single Delivery
              </button>
              <button
                className={`ghost ${deliveryMode === "batched" ? "active" : ""}`}
                onClick={() => setDeliveryMode("batched")}
              >
                Batch Optimize
              </button>
            </div>
          </div>

          <div className="field">
            <label>Assignments</label>
            <select multiple size={8} value={selectedAssignmentIds.map(String)} onChange={onSelectionChange}>
              {availableAssignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  #{assignment.id} | Order #{assignment.order_id} | {assignment.part_number} x{assignment.quantity} | {assignment.buyer_factory_name}
                </option>
              ))}
            </select>
          </div>

          <button className="primary" onClick={handleOptimize} disabled={busy}>
            {busy ? "Optimizing..." : "Optimize"}
          </button>
        </div>

        <div className="card">
          <h2>Route Efficiency</h2>
          <p className="hint">Aggregated optimization metrics from planned batched deliveries.</p>
          <div className="stats-grid">
            <div className="stat-chip">
              <span>Avg Distance</span>
              <strong>{stats ? `${stats.avg_distance_km.toFixed(2)} km` : "-"}</strong>
            </div>
            <div className="stat-chip">
              <span>Avg Duration</span>
              <strong>{stats ? `${stats.avg_duration_minutes.toFixed(1)} min` : "-"}</strong>
            </div>
            <div className="stat-chip">
              <span>Total Savings</span>
              <strong>{stats ? `${stats.total_savings_km.toFixed(2)} km` : "-"}</strong>
            </div>
            <div className="stat-chip">
              <span>Savings %</span>
              <strong>{stats ? `${stats.total_savings_percent.toFixed(1)}%` : "-"}</strong>
            </div>
          </div>
          {lastBatchResult && (
            <div className="batch-note">
              Last run: saved {lastBatchResult.total_savings_km.toFixed(2)} km ({lastBatchResult.total_savings_percent.toFixed(1)}%)
            </div>
          )}
        </div>
      </section>

      <section className="card full">
        <h2>Route Map</h2>
        <p className="hint">All current delivery routes, color-coded by delivery.</p>
        <div className="delivery-map multi-route">
          <MapContainer
            center={allRoutePoints[0] ?? [19.076, 72.8777]}
            zoom={10}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {deliveries.map((delivery, index) => {
              const points = (delivery.route_geometry?.coordinates ?? []).map(
                (coordinate) => [coordinate[1], coordinate[0]] as [number, number]
              );
              if (points.length === 0) {
                return null;
              }
              return (
                <Polyline
                  key={delivery.id}
                  positions={points}
                  pathOptions={{ color: COLORS[index % COLORS.length], weight: 4 }}
                />
              );
            })}
            <RouteBounds points={allRoutePoints} />
          </MapContainer>
        </div>
      </section>

      <section className="card full">
        <h2>Deliveries</h2>
        <p className="hint">Planned deliveries with ordered stops and quick links to detail view.</p>
        <div className="delivery-list">
          {deliveries.length === 0 && <p className="empty">No deliveries planned yet.</p>}
          {deliveries.map((delivery) => (
            <article key={delivery.id} className="delivery-item">
              <div className="delivery-item__header">
                <div>
                  <h3>Delivery #{delivery.id}</h3>
                  <p>
                    {delivery.delivery_type.toUpperCase()} | {delivery.status} | {delivery.total_distance_km?.toFixed(2) ?? "0.00"} km
                  </p>
                </div>
                <Link className="inline-link" to={`/admin/deliveries/${delivery.id}`}>
                  View Detail
                </Link>
              </div>
              <ol>
                {delivery.stops
                  .slice()
                  .sort((a, b) => a.sequence_order - b.sequence_order)
                  .map((stop) => (
                    <li key={stop.id}>
                      #{stop.sequence_order} {stop.stop_type.toUpperCase()} | Assignment #{stop.order_assignment_id} | ETA {stop.eta ? new Date(stop.eta).toLocaleString() : "n/a"}
                    </li>
                  ))}
              </ol>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DeliveryDashboard;
