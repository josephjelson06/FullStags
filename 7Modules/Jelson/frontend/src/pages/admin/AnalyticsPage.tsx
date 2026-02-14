import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet.heat";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../api/client";
import type {
  AnalyticsKpis,
  BuyerGeoPoint,
  DemandAnalyticsResponse,
  GeoAnalyticsResponse,
  RouteAnalyticsResponse,
  SupplierGeoPoint,
  SupplierPerformancePoint,
  SuppliersAnalyticsResponse,
} from "../../types";

type SupplierSortKey =
  | "supplier_name"
  | "orders_fulfilled"
  | "avg_dispatch_time_seconds"
  | "reliability_score"
  | "revenue";
type SupplierSortDirection = "asc" | "desc";

const DEFAULT_MAP_CENTER: [number, number] = [20.5937, 78.9629];
const buyerIcon = L.divIcon({
  className: "buyer-marker-icon",
  html: '<span class="buyer-marker-shape"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const formatNumber = (value: number | null | undefined, digits = 2) =>
  value == null ? "-" : value.toFixed(digits);

const stockBandColor = (stockBand: SupplierGeoPoint["stock_band"]) => {
  if (stockBand === "high") return "#16a34a";
  if (stockBand === "medium") return "#ca8a04";
  return "#dc2626";
};

const HeatLayer = ({ buyers }: { buyers: BuyerGeoPoint[] }) => {
  const map = useMap();

  useEffect(() => {
    const heatPoints = buyers
      .filter((buyer) => buyer.order_count > 0)
      .map((buyer) => [buyer.latitude, buyer.longitude, buyer.order_count] as [number, number, number]);
    if (heatPoints.length === 0) {
      return;
    }

    const heatLayerFactory = (L as any).heatLayer as
      | ((latlngs: [number, number, number][], options?: Record<string, unknown>) => L.Layer)
      | undefined;
    if (!heatLayerFactory) {
      return;
    }

    const layer = heatLayerFactory(heatPoints, {
      radius: 30,
      blur: 24,
      maxZoom: 10,
      minOpacity: 0.35,
    });
    map.addLayer(layer);

    return () => {
      map.removeLayer(layer);
    };
  }, [buyers, map]);

  return null;
};

const ClusterLayer = ({
  suppliers,
  buyers,
}: {
  suppliers: SupplierGeoPoint[];
  buyers: BuyerGeoPoint[];
}) => {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      disableClusteringAtZoom: 10,
      showCoverageOnHover: false,
    });

    suppliers.forEach((supplier) => {
      const marker = L.circleMarker([supplier.latitude, supplier.longitude], {
        radius: 8,
        color: stockBandColor(supplier.stock_band),
        fillColor: stockBandColor(supplier.stock_band),
        fillOpacity: 0.9,
        weight: 1.5,
      });
      marker.bindPopup(
        `<strong>${supplier.supplier_name}</strong><br/>Stock: ${supplier.total_stock}<br/>Band: ${supplier.stock_band}`,
      );
      clusterGroup.addLayer(marker);
    });

    buyers.forEach((buyer) => {
      const marker = L.marker([buyer.latitude, buyer.longitude], { icon: buyerIcon });
      marker.bindPopup(
        `<strong>${buyer.buyer_name}</strong><br/>Orders: ${buyer.order_count}<br/>Region: ${buyer.region}`,
      );
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    return () => {
      map.removeLayer(clusterGroup);
    };
  }, [buyers, map, suppliers]);

  return null;
};

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);
  const [demand, setDemand] = useState<DemandAnalyticsResponse | null>(null);
  const [routes, setRoutes] = useState<RouteAnalyticsResponse | null>(null);
  const [suppliersData, setSuppliersData] = useState<SupplierPerformancePoint[]>([]);
  const [geo, setGeo] = useState<GeoAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SupplierSortKey>("orders_fulfilled");
  const [sortDirection, setSortDirection] = useState<SupplierSortDirection>("desc");

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, demandRes, routeRes, suppliersRes, geoRes] = await Promise.all([
        api.get<AnalyticsKpis>("/analytics/kpis"),
        api.get<DemandAnalyticsResponse>("/analytics/demand"),
        api.get<RouteAnalyticsResponse>("/analytics/routes"),
        api.get<SuppliersAnalyticsResponse>("/analytics/suppliers"),
        api.get<GeoAnalyticsResponse>("/analytics/geo"),
      ]);
      setKpis(kpiRes.data);
      setDemand(demandRes.data);
      setRoutes(routeRes.data);
      setSuppliersData(suppliersRes.data.suppliers);
      setGeo(geoRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, []);

  const mapCenter = useMemo<[number, number]>(() => {
    if (!geo) {
      return DEFAULT_MAP_CENTER;
    }
    const points = [...geo.suppliers, ...geo.buyers];
    if (points.length === 0) {
      return DEFAULT_MAP_CENTER;
    }
    const totals = points.reduce(
      (acc, point) => ({
        lat: acc.lat + point.latitude,
        lng: acc.lng + point.longitude,
      }),
      { lat: 0, lng: 0 },
    );
    return [totals.lat / points.length, totals.lng / points.length];
  }, [geo]);

  const sortedSuppliers = useMemo(() => {
    const copy = [...suppliersData];
    copy.sort((left, right) => {
      const l = left[sortKey];
      const r = right[sortKey];
      let comparison = 0;
      if (typeof l === "string" && typeof r === "string") {
        comparison = l.localeCompare(r);
      } else {
        const leftNumber = Number(l ?? -1);
        const rightNumber = Number(r ?? -1);
        comparison = leftNumber - rightNumber;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return copy;
  }, [sortDirection, sortKey, suppliersData]);

  const setSort = (key: SupplierSortKey) => {
    setSortDirection((prevDirection) => {
      if (key === sortKey) {
        return prevDirection === "asc" ? "desc" : "asc";
      }
      return key === "supplier_name" ? "asc" : "desc";
    });
    setSortKey(key);
  };

  const sortLabel = (key: SupplierSortKey, label: string) =>
    `${label}${sortKey === key ? (sortDirection === "asc" ? " ↑" : " ↓") : ""}`;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Admin Analytics Dashboard</h2>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Real-time analytics across orders, matching, routing, delivery, and supplier performance.
          </p>
        </div>
        <button className="secondary" onClick={() => void loadAnalytics()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="card" style={{ color: "var(--danger)" }}>{error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Total Orders</div>
          <h2 style={{ marginBottom: 0 }}>{kpis?.total_orders ?? "-"}</h2>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Fulfillment Rate</div>
          <h2 style={{ marginBottom: 0 }}>{formatNumber(kpis?.fulfillment_rate_percent)}%</h2>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Avg Matching Time</div>
          <h2 style={{ marginBottom: 0 }}>{formatNumber(kpis?.avg_matching_time_seconds)} s</h2>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Avg Delivery ETA</div>
          <h2 style={{ marginBottom: 0 }}>{formatNumber(kpis?.avg_delivery_eta_minutes)} min</h2>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Route Efficiency</div>
          <h2 style={{ marginBottom: 0 }}>{formatNumber(kpis?.route_efficiency_percent)}%</h2>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Geographic Heat Map</h3>
        <div style={{ color: "var(--muted)", marginBottom: "0.7rem" }}>
          Suppliers are color-coded by stock bands, buyers are square markers, and heat intensity reflects buyer order density.
        </div>
        <div className="map-container">
          <MapContainer center={mapCenter} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HeatLayer buyers={geo?.buyers ?? []} />
            <ClusterLayer suppliers={geo?.suppliers ?? []} buyers={geo?.buyers ?? []} />
          </MapContainer>
        </div>
        <div style={{ display: "flex", gap: "1rem", color: "var(--muted)", fontSize: "0.9rem" }}>
          <span><span style={{ color: "#16a34a" }}>●</span> Stock &gt; 1000</span>
          <span><span style={{ color: "#ca8a04" }}>●</span> Stock 200-1000</span>
          <span><span style={{ color: "#dc2626" }}>●</span> Stock &lt; 200</span>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Demand Analytics</h3>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Top 10 Ordered Categories</div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={demand?.top_categories ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category_name" interval={0} angle={-18} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="order_count" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Orders Over Time (Last 30 Days)</div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={demand?.orders_over_time ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="order_count" stroke="#2563eb" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Orders by Region</div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={demand?.orders_by_region ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="region" width={90} />
                  <Tooltip />
                  <Bar dataKey="order_count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Route Efficiency Panel</h3>
        <div style={{ display: "grid", gap: "1rem" }}>
          <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
            <div style={{ color: "var(--muted)" }}>Total KM Saved (Batched VRP)</div>
            <h2 style={{ marginBottom: 0 }}>{formatNumber(routes?.total_km_saved)} km</h2>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Batched Deliveries: Naive vs Optimized</div>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={routes?.batched_deliveries ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="delivery_id" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="naive_distance_km" name="Naive (km)" fill="#f97316" />
                  <Bar dataKey="optimized_distance_km" name="Optimized (km)" fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Average Distance per Delivery Over Time</div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={routes?.avg_distance_over_time ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg_distance_km" stroke="#7c3aed" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Supplier Performance</h3>
        <table className="table">
          <thead>
            <tr>
              <th>
                <button className="secondary" onClick={() => setSort("supplier_name")}>
                  {sortLabel("supplier_name", "Supplier")}
                </button>
              </th>
              <th>
                <button className="secondary" onClick={() => setSort("orders_fulfilled")}>
                  {sortLabel("orders_fulfilled", "Orders Fulfilled")}
                </button>
              </th>
              <th>
                <button className="secondary" onClick={() => setSort("avg_dispatch_time_seconds")}>
                  {sortLabel("avg_dispatch_time_seconds", "Avg Dispatch Time")}
                </button>
              </th>
              <th>
                <button className="secondary" onClick={() => setSort("reliability_score")}>
                  {sortLabel("reliability_score", "Reliability")}
                </button>
              </th>
              <th>
                <button className="secondary" onClick={() => setSort("revenue")}>
                  {sortLabel("revenue", "Revenue")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSuppliers.map((supplier) => (
              <tr key={supplier.supplier_id}>
                <td>
                  <button
                    className="secondary"
                    onClick={() => navigate(`/admin/suppliers/${supplier.supplier_id}`)}
                  >
                    {supplier.supplier_name}
                  </button>
                </td>
                <td>{supplier.orders_fulfilled}</td>
                <td>{formatNumber(supplier.avg_dispatch_time_seconds)} s</td>
                <td>{formatNumber(supplier.reliability_score, 3)}</td>
                <td>{formatNumber(supplier.revenue)} </td>
              </tr>
            ))}
            {sortedSuppliers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>
                  No supplier data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AnalyticsPage;
