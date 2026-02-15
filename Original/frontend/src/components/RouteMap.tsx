import { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';

import type { RouteLeg } from '@/types';

import 'leaflet/dist/leaflet.css';

interface RouteMapProps {
  supplierLocation: { lat: number; lng: number };
  factoryLocation: { lat: number; lng: number };
  courierLocation: { lat: number; lng: number };
  legs: RouteLeg[];
  etaMinutesRemaining: number;
}

function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [18, 18] as L.PointTuple,
    iconAnchor: [9, 9] as L.PointTuple,
    html: `<span style="display:block;width:18px;height:18px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,0.15)"></span>`,
  });
}

export function RouteMap({
  supplierLocation,
  factoryLocation,
  courierLocation,
  legs,
  etaMinutesRemaining,
}: RouteMapProps) {
  const center = useMemo<L.LatLngExpression>(
    () => [
      (supplierLocation.lat + factoryLocation.lat) / 2,
      (supplierLocation.lng + factoryLocation.lng) / 2,
    ],
    [factoryLocation.lat, factoryLocation.lng, supplierLocation.lat, supplierLocation.lng],
  );

  const line = useMemo<L.LatLngExpression[]>(
    () => [
      [supplierLocation.lat, supplierLocation.lng],
      [factoryLocation.lat, factoryLocation.lng],
    ],
    [factoryLocation.lat, factoryLocation.lng, supplierLocation.lat, supplierLocation.lng],
  );

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-text-primary">Courier Route</h3>
        <p className="rounded-full bg-border-light px-3 py-1 text-xs font-semibold text-text-secondary">
          ETA {etaMinutesRemaining} min
        </p>
      </div>

      <div className="h-80 overflow-hidden rounded-lg border border-border">
        <MapContainer center={center} zoom={11} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Polyline positions={line} pathOptions={{ color: '#2563eb', weight: 4 }} />

          <Marker position={[supplierLocation.lat, supplierLocation.lng]} icon={pinIcon('#2563eb')}>
            <Popup>Supplier</Popup>
          </Marker>

          <Marker position={[factoryLocation.lat, factoryLocation.lng]} icon={pinIcon('#ef4444')}>
            <Popup>Factory</Popup>
          </Marker>

          <Marker position={[courierLocation.lat, courierLocation.lng]} icon={pinIcon('#f59e0b')}>
            <Popup>Courier</Popup>
          </Marker>
        </MapContainer>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {legs.map((leg) => (
          <div key={leg.label} className="rounded-md border border-border px-3 py-2 text-sm">
            <p className="font-medium text-text-primary">{leg.label}</p>
            <p className="text-xs uppercase tracking-wide text-text-secondary">{leg.status.replace('_', ' ')}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
