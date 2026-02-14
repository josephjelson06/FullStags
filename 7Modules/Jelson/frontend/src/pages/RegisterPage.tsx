import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import api from "../api/client";
import useAuthStore from "../stores/authStore";

const defaultCenter = { lat: 20.5937, lng: 78.9629 };

type ActiveTab = "buyer" | "supplier";

interface BuyerForm {
  email: string;
  password: string;
  factory_name: string;
  industry_type: string;
  delivery_address: string;
  latitude: string;
  longitude: string;
}

interface SupplierForm {
  email: string;
  password: string;
  business_name: string;
  warehouse_address: string;
  gst_number: string;
  service_radius_km: string;
  latitude: string;
  longitude: string;
}

interface MapPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
  position: { lat: number; lng: number } | null;
}

const MapPicker = ({ open, onClose, onSelect, position }: MapPickerProps) => {
  if (!open) {
    return null;
  }

  const ClickHandler = () => {
    useMapEvents({
      click(event) {
        onSelect(event.latlng.lat, event.latlng.lng);
      },
    });
    return null;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Pick location</h3>
        <div className="map-container">
          <MapContainer
            center={position ?? defaultCenter}
            zoom={position ? 12 : 4}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler />
            {position && (
              <CircleMarker center={position} pathOptions={{ color: "#0ea5e9" }} radius={8} />
            )}
          </MapContainer>
        </div>
        {position && (
          <div style={{ marginBottom: "1rem", color: "var(--muted)" }}>
            Selected: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </div>
        )}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>("buyer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const [buyerForm, setBuyerForm] = useState<BuyerForm>({
    email: "",
    password: "",
    factory_name: "",
    industry_type: "",
    delivery_address: "",
    latitude: "",
    longitude: "",
  });

  const [supplierForm, setSupplierForm] = useState<SupplierForm>({
    email: "",
    password: "",
    business_name: "",
    warehouse_address: "",
    gst_number: "",
    service_radius_km: "100",
    latitude: "",
    longitude: "",
  });

  const mapPosition = useMemo(() => {
    const form = activeTab === "buyer" ? buyerForm : supplierForm;
    if (form.latitude && form.longitude) {
      return { lat: Number(form.latitude), lng: Number(form.longitude) };
    }
    return null;
  }, [activeTab, buyerForm, supplierForm]);

  const handleRegisterBuyer = async () => {
    await api.post("/auth/register/buyer", {
      ...buyerForm,
      latitude: Number(buyerForm.latitude),
      longitude: Number(buyerForm.longitude),
      industry_type: buyerForm.industry_type || null,
      delivery_address: buyerForm.delivery_address || null,
    });
    await login(buyerForm.email, buyerForm.password);
    navigate("/buyer");
  };

  const handleRegisterSupplier = async () => {
    await api.post("/auth/register/supplier", {
      ...supplierForm,
      latitude: Number(supplierForm.latitude),
      longitude: Number(supplierForm.longitude),
      service_radius_km: supplierForm.service_radius_km
        ? Number(supplierForm.service_radius_km)
        : null,
      warehouse_address: supplierForm.warehouse_address || null,
      gst_number: supplierForm.gst_number || null,
    });
    await login(supplierForm.email, supplierForm.password);
    navigate("/supplier");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (activeTab === "buyer") {
        await handleRegisterBuyer();
      } else {
        await handleRegisterSupplier();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const updateBuyer = (field: keyof BuyerForm, value: string) => {
    setBuyerForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateSupplier = (field: keyof SupplierForm, value: string) => {
    setSupplierForm((prev) => ({ ...prev, [field]: value }));
  };

  const openMap = () => setMapOpen(true);

  const handleSelect = (lat: number, lng: number) => {
    if (activeTab === "buyer") {
      updateBuyer("latitude", lat.toFixed(6));
      updateBuyer("longitude", lng.toFixed(6));
    } else {
      updateSupplier("latitude", lat.toFixed(6));
      updateSupplier("longitude", lng.toFixed(6));
    }
  };

  return (
    <div className="auth-card">
      <h1>Create your account</h1>
      <p style={{ color: "var(--muted)" }}>
        Join the procurement network as a buyer or supplier.
      </p>

      <div className="tabs">
        <div
          className={`tab ${activeTab === "buyer" ? "active" : ""}`}
          onClick={() => setActiveTab("buyer")}
        >
          Buyer
        </div>
        <div
          className={`tab ${activeTab === "supplier" ? "active" : ""}`}
          onClick={() => setActiveTab("supplier")}
        >
          Supplier
        </div>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        {activeTab === "buyer" ? (
          <>
            <div>
              <label>Email</label>
              <input
                type="email"
                value={buyerForm.email}
                onChange={(event) => updateBuyer("email", event.target.value)}
                required
              />
            </div>
            <div>
              <label>Password</label>
              <input
                type="password"
                value={buyerForm.password}
                onChange={(event) => updateBuyer("password", event.target.value)}
                required
              />
            </div>
            <div>
              <label>Factory name</label>
              <input
                value={buyerForm.factory_name}
                onChange={(event) => updateBuyer("factory_name", event.target.value)}
                required
              />
            </div>
            <div>
              <label>Industry type</label>
              <input
                value={buyerForm.industry_type}
                onChange={(event) => updateBuyer("industry_type", event.target.value)}
              />
            </div>
            <div>
              <label>Delivery address</label>
              <input
                value={buyerForm.delivery_address}
                onChange={(event) => updateBuyer("delivery_address", event.target.value)}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label>Email</label>
              <input
                type="email"
                value={supplierForm.email}
                onChange={(event) => updateSupplier("email", event.target.value)}
                required
              />
            </div>
            <div>
              <label>Password</label>
              <input
                type="password"
                value={supplierForm.password}
                onChange={(event) => updateSupplier("password", event.target.value)}
                required
              />
            </div>
            <div>
              <label>Business name</label>
              <input
                value={supplierForm.business_name}
                onChange={(event) => updateSupplier("business_name", event.target.value)}
                required
              />
            </div>
            <div>
              <label>Warehouse address</label>
              <input
                value={supplierForm.warehouse_address}
                onChange={(event) => updateSupplier("warehouse_address", event.target.value)}
              />
            </div>
            <div>
              <label>GST number</label>
              <input
                value={supplierForm.gst_number}
                onChange={(event) => updateSupplier("gst_number", event.target.value)}
              />
            </div>
            <div>
              <label>Service radius (km)</label>
              <input
                type="number"
                min="1"
                value={supplierForm.service_radius_km}
                onChange={(event) => updateSupplier("service_radius_km", event.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <label>Latitude</label>
          <input
            value={activeTab === "buyer" ? buyerForm.latitude : supplierForm.latitude}
            onChange={(event) =>
              activeTab === "buyer"
                ? updateBuyer("latitude", event.target.value)
                : updateSupplier("latitude", event.target.value)
            }
            required
          />
        </div>
        <div>
          <label>Longitude</label>
          <input
            value={activeTab === "buyer" ? buyerForm.longitude : supplierForm.longitude}
            onChange={(event) =>
              activeTab === "buyer"
                ? updateBuyer("longitude", event.target.value)
                : updateSupplier("longitude", event.target.value)
            }
            required
          />
        </div>
        <div>
          <button type="button" className="secondary" onClick={openMap}>
            Pick on Map
          </button>
        </div>

        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: "1rem" }}>
        Already registered? <Link to="/login">Sign in</Link>
      </p>

      <MapPicker
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onSelect={handleSelect}
        position={mapPosition}
      />
    </div>
  );
};

export default RegisterPage;
