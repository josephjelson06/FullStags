import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

import type { DeliveryStop, GeoLineString } from "../types/delivery";

type DeliveryMapProps = {
  routeGeometry?: GeoLineString | null;
  stops: DeliveryStop[];
  className?: string;
};

const DEFAULT_CENTER: [number, number] = [19.076, 72.8777];

const FitBounds = ({ points }: { points: Array<[number, number]> }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [28, 28] });
    }
  }, [map, points]);

  return null;
};

const createStopIcon = (stop: DeliveryStop) => {
  const isPickup = stop.stop_type === "pickup";
  const className = isPickup ? "delivery-marker pickup" : "delivery-marker dropoff";
  return L.divIcon({
    className: "delivery-marker-wrap",
    html: `<div class="${className}">${stop.sequence_order}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
};

const DeliveryMap = ({ routeGeometry, stops, className }: DeliveryMapProps) => {
  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => a.sequence_order - b.sequence_order),
    [stops]
  );

  const routePoints = useMemo(() => {
    if (!routeGeometry?.coordinates?.length) {
      return [] as Array<[number, number]>;
    }
    return routeGeometry.coordinates.map((coordinate) => [coordinate[1], coordinate[0]] as [number, number]);
  }, [routeGeometry]);

  const stopPoints = useMemo(
    () => sortedStops.map((stop) => [stop.latitude, stop.longitude] as [number, number]),
    [sortedStops]
  );

  const allPoints = routePoints.length > 0 ? routePoints : stopPoints;
  const center = allPoints[0] ?? DEFAULT_CENTER;

  return (
    <div className={className ?? "delivery-map"}>
      <MapContainer center={center} zoom={11} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routePoints.length > 0 && <Polyline positions={routePoints} pathOptions={{ color: "#0055c7", weight: 4 }} />}
        {sortedStops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.latitude, stop.longitude]}
            icon={createStopIcon(stop)}
          >
            <Popup>
              <div className="delivery-popup">
                <strong>{stop.stop_type === "pickup" ? "Pickup" : "Dropoff"}</strong>
                <p>Stop #{stop.sequence_order}</p>
                <p>Assignment #{stop.order_assignment_id}</p>
                <p>ETA: {stop.eta ? new Date(stop.eta).toLocaleString() : "n/a"}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds points={allPoints} />
      </MapContainer>
    </div>
  );
};

export default DeliveryMap;
