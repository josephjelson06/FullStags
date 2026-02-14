import { Navigate, useParams } from "react-router-dom";
import OrderStatusTracker from "../components/OrderStatusTracker";

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const parsedOrderId = Number(orderId);

  if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Order #{parsedOrderId}</h2>
        <p style={{ color: "var(--muted)" }}>
          This tracker updates in real time as matching, dispatch, transit, and delivery events are emitted.
        </p>
      </div>
      <OrderStatusTracker orderId={parsedOrderId} />
    </div>
  );
};

export default OrderDetailsPage;
