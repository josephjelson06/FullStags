import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import CatalogPage from "./pages/supplier/CatalogPage";
import CSVUploadPage from "./pages/supplier/CSVUploadPage";
import InventoryDashboard from "./pages/supplier/InventoryDashboard";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import AssignedOrdersPage from "./pages/supplier/AssignedOrdersPage";
import PartSearchPage from "./pages/buyer/PartSearchPage";
import CreateOrderPage from "./pages/buyer/CreateOrderPage";
import OrdersPage from "./pages/buyer/OrdersPage";
import OrderDetailPage from "./pages/buyer/OrderDetailPage";
import AllOrdersPage from "./pages/admin/AllOrdersPage";
import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

const setTestUser = (role: "supplier" | "admin" | "buyer") => {
  const userId = role === "buyer" ? 6 : 1;
  localStorage.setItem("x-test-user", JSON.stringify({ user_id: userId, role }));
  window.location.reload();
};

const activeClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "nav-link active" : "nav-link";

export default function App() {
  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-title">Inventory + Order Management</div>
        <nav className="nav-links">
          <NavLink className={activeClass} to="/buyer/dashboard">
            Buyer Dashboard
          </NavLink>
          <NavLink className={activeClass} to="/buyer/orders">
            Buyer Orders
          </NavLink>
          <NavLink className={activeClass} to="/buyer/create-order">
            Create Order
          </NavLink>
          <NavLink className={activeClass} to="/supplier/assigned-orders">
            Assigned Orders
          </NavLink>
          <NavLink className={activeClass} to="/admin/orders">
            Admin Orders
          </NavLink>
          <NavLink className={activeClass} to="/supplier/dashboard">
            Supplier Dashboard
          </NavLink>
          <NavLink className={activeClass} to="/supplier/inventory">
            Inventory Dashboard
          </NavLink>
          <NavLink className={activeClass} to="/supplier/catalog">
            Catalog
          </NavLink>
          <NavLink className={activeClass} to="/supplier/csv-upload">
            CSV Upload
          </NavLink>
          <NavLink className={activeClass} to="/buyer/search">
            Buyer Search
          </NavLink>
        </nav>
        <div className="nav-links">
          <button className="button ghost" onClick={() => setTestUser("supplier")}>
            Supplier Mode
          </button>
          <button className="button ghost" onClick={() => setTestUser("admin")}>
            Admin Mode
          </button>
          <button className="button ghost" onClick={() => setTestUser("buyer")}>
            Buyer Mode
          </button>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route
            path="/buyer/orders"
            element={
              <ProtectedRoute allowedRoles={["buyer"]}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/dashboard"
            element={
              <ProtectedRoute allowedRoles={["buyer"]}>
                <BuyerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/create-order"
            element={
              <ProtectedRoute allowedRoles={["buyer"]}>
                <CreateOrderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/buyer/search"
            element={
              <ProtectedRoute allowedRoles={["buyer"]}>
                <PartSearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:orderId"
            element={
              <ProtectedRoute allowedRoles={["buyer", "supplier", "admin"]}>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/supplier/dashboard"
            element={
              <ProtectedRoute allowedRoles={["supplier"]}>
                <SupplierDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier/inventory"
            element={
              <ProtectedRoute allowedRoles={["supplier"]}>
                <InventoryDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier/catalog"
            element={
              <ProtectedRoute allowedRoles={["supplier"]}>
                <CatalogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier/csv-upload"
            element={
              <ProtectedRoute allowedRoles={["supplier"]}>
                <CSVUploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supplier/assigned-orders"
            element={
              <ProtectedRoute allowedRoles={["supplier"]}>
                <AssignedOrdersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AllOrdersPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/buyer/orders" replace />} />
        </Routes>
      </main>
    </div>
  );
}
