import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import useAuthStore from "../../stores/authStore";
import type { Order } from "../../types";

const AssignedOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const supplierProfileId = useAuthStore((state) => state.user?.profile_id ?? null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get<Order[]>("/orders/");
      setOrders(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  const assignments = useMemo(() => {
    const rows: Array<{
      orderId: number;
      orderStatus: string;
      orderItemId: number;
      partNumber: string;
      quantity: number;
      assignmentId: number;
      assignmentStatus: string;
    }> = [];
    for (const order of orders) {
      for (const item of order.items) {
        for (const assignment of item.assignments) {
          if (supplierProfileId && assignment.supplier_id !== supplierProfileId) {
            continue;
          }
          rows.push({
            orderId: order.id,
            orderStatus: order.status,
            orderItemId: item.id,
            partNumber: item.part_number,
            quantity: item.quantity,
            assignmentId: assignment.id,
            assignmentStatus: assignment.status,
          });
        }
      }
    }
    return rows;
  }, [orders, supplierProfileId]);

  const setAssignmentStatus = async (assignmentId: number, status: string) => {
    await api.patch(`/orders/assignments/${assignmentId}/status`, { status });
    await fetchOrders();
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Assigned Orders</h2>
        <button className="secondary" onClick={() => void fetchOrders()}>
          Refresh
        </button>
      </div>
      {loading ? (
        <div>Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>No assignments found.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Assignment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((row) => (
              <tr key={row.assignmentId}>
                <td>#{row.orderId}</td>
                <td>{row.partNumber}</td>
                <td>{row.quantity}</td>
                <td>#{row.assignmentId}</td>
                <td>{row.assignmentStatus}</td>
                <td style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    className="secondary"
                    onClick={() => void setAssignmentStatus(row.assignmentId, "ACCEPTED")}
                  >
                    Accept
                  </button>
                  <button
                    className="secondary"
                    onClick={() => void setAssignmentStatus(row.assignmentId, "REJECTED")}
                  >
                    Reject
                  </button>
                  <button onClick={() => void setAssignmentStatus(row.assignmentId, "FULFILLED")}>
                    Fulfill
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AssignedOrdersPage;
