import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminDashboard from "./pages/admin/Dashboard";
import UsersPage from "./pages/admin/UsersPage";
import AllOrdersPage from "./pages/admin/AllOrdersPage";
import AdminDeliveriesPage from "./pages/admin/DeliveriesPage";
import EventsPage from "./pages/admin/EventsPage";
import MatchingPage from "./pages/admin/MatchingPage";
import SupplierDetailPage from "./pages/admin/SupplierDetailPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import BuyerDashboard from "./pages/buyer/Dashboard";
import BuyerCatalogPage from "./pages/buyer/CatalogPage";
import BuyerDeliveriesPage from "./pages/buyer/DeliveriesPage";
import PlaceOrderPage from "./pages/buyer/PlaceOrderPage";
import MyOrdersPage from "./pages/buyer/MyOrdersPage";
import SupplierDashboard from "./pages/supplier/Dashboard";
import SupplierCatalogPage from "./pages/supplier/CatalogPage";
import SupplierDeliveriesPage from "./pages/supplier/DeliveriesPage";
import InventoryPage from "./pages/supplier/InventoryPage";
import AssignedOrdersPage from "./pages/supplier/AssignedOrdersPage";
import OrderDetailsPage from "./pages/OrderDetailsPage";

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute role="buyer" />}>
        <Route element={<Layout />}>
          <Route path="/buyer" element={<BuyerDashboard />} />
          <Route path="/buyer/catalog" element={<BuyerCatalogPage />} />
          <Route path="/buyer/place-order" element={<PlaceOrderPage />} />
          <Route path="/buyer/orders" element={<MyOrdersPage />} />
          <Route path="/buyer/deliveries" element={<BuyerDeliveriesPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="supplier" />}>
        <Route element={<Layout />}>
          <Route path="/supplier" element={<SupplierDashboard />} />
          <Route path="/supplier/catalog" element={<SupplierCatalogPage />} />
          <Route path="/supplier/inventory" element={<InventoryPage />} />
          <Route path="/supplier/assigned" element={<AssignedOrdersPage />} />
          <Route path="/supplier/deliveries" element={<SupplierDeliveriesPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="admin" />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/orders" element={<AllOrdersPage />} />
          <Route path="/admin/matching" element={<MatchingPage />} />
          <Route path="/admin/deliveries" element={<AdminDeliveriesPage />} />
          <Route path="/admin/events" element={<EventsPage />} />
          <Route path="/admin/suppliers/:supplierId" element={<SupplierDetailPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/orders/:orderId" element={<OrderDetailsPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
