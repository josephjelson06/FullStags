import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchDeliveryById } from "../../api/client";
import DeliveryMap from "../../components/DeliveryMap";
import type { DeliveryResponse } from "../../types/delivery";

const TrackDeliveryPage = () => {
  const params = useParams();
  const deliveryId = Number(params.deliveryId);

  const [delivery, setDelivery] = useState<DeliveryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deliveryId) {
      setError("Invalid delivery id.");
      return;
    }

    fetchDeliveryById(deliveryId)
      .then((response) => setDelivery(response))
      .catch((err) => setError((err as Error).message));
  }, [deliveryId]);

  const orderedStops = useMemo(
    () => [...(delivery?.stops ?? [])].sort((a, b) => a.sequence_order - b.sequence_order),
    [delivery]
  );

  const buyerDropoff = useMemo(
    () => orderedStops.find((stop) => stop.stop_type === "dropoff") ?? null,
    [orderedStops]
  );

  return (
    <div className="page buyer-track-page">
      <header className="page__header">
        <div>
          <p className="eyebrow">Buyer Tracking</p>
          <h1>Track Delivery {delivery ? `#${delivery.id}` : ""}</h1>
          <p className="subtitle">Live route and stop timeline for your incoming shipment.</p>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      {!delivery && !error && <p className="hint">Loading delivery tracking details...</p>}

      {delivery && (
        <>
          <section className="grid">
            <div className="card">
              <h2>Status</h2>
              <div className={`status-banner ${delivery.status.toLowerCase()}`}>
                {delivery.status.replace("_", " ")}
              </div>
              <p className="hint">
                ETA: {delivery.latest_eta ? new Date(delivery.latest_eta).toLocaleString() : "Not available"}
              </p>
              {buyerDropoff && (
                <p className="hint">
                  Your dropoff is stop #{buyerDropoff.sequence_order} in this route.
                </p>
              )}
            </div>
            <div className="card">
              <h2>Route Metrics</h2>
              <p className="hint">Distance: {delivery.total_distance_km?.toFixed(2) ?? "0.00"} km</p>
              <p className="hint">Duration: {delivery.total_duration_minutes?.toFixed(1) ?? "0.0"} minutes</p>
              <p className="hint">Type: {delivery.delivery_type.toUpperCase()}</p>
            </div>
          </section>

          <section className="card full">
            <h2>Live Map</h2>
            <DeliveryMap
              routeGeometry={delivery.route_geometry ?? undefined}
              stops={orderedStops}
              className="delivery-map buyer-map"
            />
          </section>

          <section className="card full">
            <h2>Stop Timeline</h2>
            <ol className="timeline">
              {orderedStops.map((stop) => (
                <li key={stop.id} className={`timeline-item ${stop.stop_type}`}>
                  <span className="timeline-step">{stop.sequence_order}</span>
                  <div>
                    <strong>{stop.stop_type.toUpperCase()}</strong>
                    <p>Assignment #{stop.order_assignment_id}</p>
                    <p>ETA: {stop.eta ? new Date(stop.eta).toLocaleString() : "n/a"}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
};

export default TrackDeliveryPage;
