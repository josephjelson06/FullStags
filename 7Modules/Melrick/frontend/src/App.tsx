import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthLoginPage from "./pages/AuthLoginPage";
import ForbiddenPage from "./pages/ForbiddenPage";
import AnalyticsDashboard from "./pages/admin/AnalyticsDashboard";
import DeliveryDashboard from "./pages/admin/DeliveryDashboard";
import DeliveryDetailPage from "./pages/admin/DeliveryDetailPage";
import MatchingDashboard from "./pages/admin/MatchingDashboard";
import TrackDeliveryPage from "./pages/buyer/TrackDeliveryPage";
import ModulePlaceholderPage from "./pages/shared/ModulePlaceholderPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/matching" replace />} />

      <Route element={<AppLayout />}>
        <Route path="/auth/login" element={<AuthLoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        <Route
          path="/users/profile"
          element={
            <ProtectedRoute allowedRoles={["buyer", "supplier", "admin"]}>
              <ModulePlaceholderPage
                title="User Profiles"
                description="Module 1 routes are registered and protected in this integration shell."
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/suppliers/catalog"
          element={
            <ProtectedRoute allowedRoles={["supplier", "admin"]}>
              <ModulePlaceholderPage
                title="Supplier Catalog"
                description="Module 4 catalog/inventory pages plug into this route once merged."
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={["supplier", "admin"]}>
              <ModulePlaceholderPage
                title="Inventory Management"
                description="Inventory operations are reserved here for the unified frontend."
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={["buyer", "supplier", "admin"]}>
              <ModulePlaceholderPage
                title="Orders"
                description="Module 5 order pages connect to this route after merge."
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/matching"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MatchingDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/deliveries"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DeliveryDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/deliveries/:deliveryId"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DeliveryDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/deliveries/:deliveryId"
          element={
            <ProtectedRoute allowedRoles={["buyer", "admin"]}>
              <TrackDeliveryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={["buyer", "supplier", "admin"]}>
              <ModulePlaceholderPage
                title="Notifications"
                description="Module 6 notifications center will mount here during merge."
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AnalyticsDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
