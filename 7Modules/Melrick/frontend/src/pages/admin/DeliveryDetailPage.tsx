import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  fetchDeliveryById,
  triggerDeliveryEtaUpdate,
  updateDeliveryStatus,
} from "../../api/client";
import DeliveryMap from "../../components/DeliveryMap";
import type { DeliveryResponse } from "../../types/delivery";

const DeliveryDetailPage = () => {
  const params = useParams();
  const deliveryId = Number(params.deliveryId);

  const [delivery, setDelivery] = useState<DeliveryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedStops = useMemo(
    () => [...(delivery?.stops ?? [])].sort((a, b) => a.sequence_order - b.sequence_order),
    [delivery]
  );

  const loadDelivery = async () => {
    const response = await fetchDeliveryById(deliveryId);
    setDelivery(response);
  };

  useEffect(() => {
    if (!deliveryId) {
      setError("Invalid delivery ID.");
      return;
    }

    loadDelivery().catch((err) => setError((err as Error).message));
  }, [deliveryId]);

  const handleStatusChange = async (status: "PLANNED" | "IN_PROGRESS" | "COMPLETED") => {
    if (!delivery) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await updateDeliveryStatus(delivery.id, status);
      setDelivery(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleEtaUpdate = async () => {
    if (!delivery) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await triggerDeliveryEtaUpdate(delivery.id);
      setDelivery(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!delivery) {
    return (
      <div className="page delivery-detail-page">
        {error && <div className="alert">{error}</div>}
        <p className="hint">Loading delivery...</p>
      </div>
    );
  }

  return (
    <div className="page delivery-detail-page">
      <header className="page__header">
        <div>
          <p className="eyebrow">Delivery Detail</p>
          <h1>Delivery #{delivery.id}</h1>
          <p className="subtitle">
            {delivery.delivery_type.toUpperCase()} | {delivery.status} | {delivery.total_distance_km?.toFixed(2) ?? "0.00"} km
          </p>
        </div>
        <Link className="inline-link" to="/admin/deliveries">
          Back to Dashboard
        </Link>
      </header>

      {error && <div className="alert">{error}</div>}

      <section className="delivery-detail-layout">
        <div className="card delivery-map-card">
          <DeliveryMap
            routeGeometry={delivery.route_geometry ?? undefined}
            stops={sortedStops}
            className="delivery-map detail-map"
          />
        </div>

        <aside className="card delivery-side">
          <h2>Status and ETA</h2>
          <p>
            Current status: <strong>{delivery.status}</strong>
          </p>
          <p>
            Latest ETA: <strong>{delivery.latest_eta ? new Date(delivery.latest_eta).toLocaleString() : "n/a"}</strong>
          </p>
          <p>
            Total duration: <strong>{delivery.total_duration_minutes?.toFixed(1) ?? "0.0"} minutes</strong>
          </p>

          <div className="actions status-actions">
            <button className="ghost" disabled={busy} onClick={() => handleStatusChange("IN_PROGRESS")}>
              Mark In Progress
            </button>
            <button className="ghost" disabled={busy} onClick={() => handleStatusChange("COMPLETED")}>
              Mark Completed
            </button>
            <button className="primary" disabled={busy} onClick={handleEtaUpdate}>
              Update ETA
            </button>
          </div>

          <h2>Stops</h2>
          <ol className="stop-list">
            {sortedStops.map((stop) => (
              <li key={stop.id}>
                <strong>#{stop.sequence_order}</strong> {stop.stop_type.toUpperCase()} | Assignment #{stop.order_assignment_id}
                <br />
                ETA: {stop.eta ? new Date(stop.eta).toLocaleString() : "n/a"}
              </li>
            ))}
          </ol>
        </aside>
      </section>
    </div>
  );
};

export default DeliveryDetailPage;
