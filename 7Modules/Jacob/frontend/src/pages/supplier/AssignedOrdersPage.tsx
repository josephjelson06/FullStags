import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentSupplier } from "../../api/inventory";
import { confirmAssignment, listOrders, rejectAssignment } from "../../api/orders";
import { OrderAssignment, OrderRecord } from "../../types/order";

type AssignmentRow = {
  orderId: number;
  itemId: number;
  partNumber: string;
  partDescription?: string | null;
  quantity: number;
  buyerFactoryName?: string | null;
  assignment: OrderAssignment;
};

const statusClass = (status: string) => {
  if (status === "ACCEPTED" || status === "FULFILLED") return "tag green";
  if (status === "REJECTED") return "tag red";
  return "tag yellow";
};

export default function AssignedOrdersPage() {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const supplier = await getCurrentSupplier();
      const response = await listOrders({ page: 1, pageSize: 200 });
      const flattened: AssignmentRow[] = [];

      response.items.forEach((order: OrderRecord) => {
        order.items.forEach((item) => {
          item.assignments
            .filter((assignment) => assignment.supplier_id === supplier.id)
            .forEach((assignment) => {
              flattened.push({
                orderId: order.id,
                itemId: item.id,
                partNumber: item.part_number,
                partDescription: item.part_description,
                quantity: item.quantity,
                buyerFactoryName: order.buyer_factory_name,
                assignment,
              });
            });
        });
      });

      flattened.sort((a, b) => b.assignment.id - a.assignment.id);
      setRows(flattened);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

  const takeAction = async (assignmentId: number, action: "accept" | "reject") => {
    setActingId(assignmentId);
    setError(null);
    try {
      if (action === "accept") {
        await confirmAssignment(assignmentId);
      } else {
        await rejectAssignment(assignmentId);
      }
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} assignment`);
    } finally {
      setActingId(null);
    }
  };

  const proposedCount = useMemo(
    () => rows.filter((row) => row.assignment.status === "PROPOSED").length,
    [rows]
  );

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Assigned Orders</h1>
          <p style={{ marginBottom: 0, color: "var(--muted)" }}>
            Review and respond to matched order assignments.
          </p>
        </div>
        <div className="tag yellow">Proposed Assignments: {proposedCount}</div>
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "#e38b8b", color: "#8b1b1b" }}>{error}</div>
      ) : null}

      {loading ? (
        <div className="card" style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {rows.map((row) => (
            <article key={row.assignment.id} className="card" style={{ display: "grid", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>Order #{row.orderId}</strong>
                <span className={statusClass(row.assignment.status)}>{row.assignment.status}</span>
              </div>
              <div>
                <strong>Part:</strong> {row.partNumber}
              </div>
              <div>
                <strong>Description:</strong> {row.partDescription ?? "-"}
              </div>
              <div>
                <strong>Quantity:</strong> {row.quantity}
              </div>
              <div>
                <strong>Buyer Factory:</strong> {row.buyerFactoryName ?? "-"}
              </div>
              <div>
                <strong>Distance:</strong> {row.assignment.distance_km?.toFixed(2) ?? "-"} km
              </div>
              <div>
                <strong>Proposed Price:</strong>{" "}
                {row.assignment.assigned_price ? `Rs ${row.assignment.assigned_price}` : "-"}
              </div>
              <div>
                <strong>Match Score:</strong> {row.assignment.match_score?.toFixed(3) ?? "-"}
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {row.assignment.status === "PROPOSED" ? (
                  <>
                    <button
                      className="button"
                      onClick={() => takeAction(row.assignment.id, "accept")}
                      disabled={actingId === row.assignment.id}
                    >
                      Accept
                    </button>
                    <button
                      className="button ghost"
                      onClick={() => takeAction(row.assignment.id, "reject")}
                      disabled={actingId === row.assignment.id}
                    >
                      Reject
                    </button>
                  </>
                ) : null}
                <button className="button secondary" onClick={() => navigate(`/orders/${row.orderId}`)}>
                  View Order
                </button>
              </div>
            </article>
          ))}

          {rows.length === 0 ? (
            <div className="card" style={{ color: "var(--muted)" }}>
              No assignments available for this supplier.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
