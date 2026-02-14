import { Navigate, Outlet, Route, Routes, BrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/layouts/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
import { getRoleHomePath } from '@/utils/routes';

// ── Auth ──────────────────────────────────────────────────────────────
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';

// ── Buyer Pages ───────────────────────────────────────────────────────
import { BuyerProfile } from '@/pages/buyer/profile/BuyerProfile';
import { EmergencyRequest } from '@/pages/buyer/EmergencyRequest';
import { MatchDetail } from '@/pages/buyer/matching/MatchDetail';
import { LiveTracking } from '@/pages/buyer/routes/LiveTracking';
import { BrowseSupplierProfile } from '@/pages/buyer/browse/SupplierProfile';
import { PartDetail } from '@/pages/buyer/browse/PartDetail';
import { CartCheckout } from '@/pages/buyer/orders/CartCheckout';
import { ActiveOrders } from '@/pages/buyer/ActiveOrders';
import { OrderDetail } from '@/pages/buyer/OrderDetail';
import { BuyerNotifications } from '@/pages/buyer/notifications/Notifications';
import { BuyerDashboard } from '@/pages/buyer/analytics/BuyerDashboard';

// ── Supplier Pages ────────────────────────────────────────────────────
import { SupplierProfile } from '@/pages/supplier/profile/SupplierProfile';
import { MyMatches } from '@/pages/supplier/matching/MyMatches';
import { OutgoingDeliveries } from '@/pages/supplier/routes/OutgoingDeliveries';
import { InventoryManager } from '@/pages/supplier/InventoryManager';
import { PartEditor } from '@/pages/supplier/inventory/PartEditor';
import { BulkUpload } from '@/pages/supplier/inventory/BulkUpload';
import { LowStockAlerts } from '@/pages/supplier/inventory/LowStockAlerts';
import { IncomingOrders } from '@/pages/supplier/IncomingOrders';
import { OrderHistory as SupplierOrderHistory } from '@/pages/supplier/orders/OrderHistory';
import { SupplierNotifications } from '@/pages/supplier/notifications/Notifications';
import { SupplierDashboard } from '@/pages/supplier/analytics/SupplierDashboard';
import { SupplierReports } from '@/pages/supplier/analytics/SupplierReports';

// ── Admin Pages ───────────────────────────────────────────────────────
import { UserManagement } from '@/pages/admin/users/UserManagement';
import { UserDetail } from '@/pages/admin/users/UserDetail';
import { RolesPermissions } from '@/pages/admin/users/RolesPermissions';
import { MatchConfig } from '@/pages/admin/matching/MatchConfig';
import { MatchLogs } from '@/pages/admin/matching/MatchLogs';
import { RouteMonitor } from '@/pages/admin/routes/RouteMonitor';
import { RouteHistory } from '@/pages/admin/routes/RouteHistory';
import { AllSuppliers } from '@/pages/admin/inventory/AllSuppliers';
import { AdminSupplierDetail } from '@/pages/admin/inventory/SupplierDetail';
import { PlatformInventory } from '@/pages/admin/inventory/PlatformInventory';
import { AllOrders } from '@/pages/admin/orders/AllOrders';
import { DisputedOrders } from '@/pages/admin/orders/DisputedOrders';
import { NotificationCenter } from '@/pages/admin/notifications/NotificationCenter';
import { NotificationTemplates } from '@/pages/admin/notifications/NotificationTemplates';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminReports } from '@/pages/admin/analytics/Reports';

/* ── Protected Route Guard (RBAC + multi-tenancy) ──── */
function ProtectedRoute({ allowedRoles }: { allowedRoles?: UserRole[] }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Multi-tenancy RBAC: if the user's role isn't in the allowed list,
  // redirect them to their own role's home page — never expose another
  // tenant's data or UI.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHomePath(user.role)} replace />;
  }

  return <Outlet />;
}

function RootRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleHomePath(user.role)} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* ─────────────── BUYER ROUTES ─────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['buyer']} />}>
              {/* Auth / Profile */}
              <Route path="/buyer/profile" element={<BuyerProfile />} />

              {/* Matching Engine */}
              <Route path="/buyer/emergency" element={<EmergencyRequest />} />
              <Route path="/buyer/matches/:matchId" element={<MatchDetail />} />

              {/* Route Optimization */}
              <Route path="/buyer/tracking/:orderId" element={<LiveTracking />} />

              {/* Browse Suppliers & Parts */}
              <Route path="/buyer/suppliers/:supplierId" element={<BrowseSupplierProfile />} />
              <Route path="/buyer/parts/:partId" element={<PartDetail />} />

              {/* Order Management */}
              <Route path="/buyer/cart" element={<CartCheckout />} />
              <Route path="/buyer/orders" element={<ActiveOrders />} />
              <Route path="/buyer/orders/:orderId" element={<OrderDetail />} />

              {/* Notifications */}
              <Route path="/buyer/notifications" element={<BuyerNotifications />} />

              {/* Analytics */}
              <Route path="/buyer/analytics" element={<BuyerDashboard />} />
            </Route>

            {/* ─────────────── SUPPLIER ROUTES ─────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['supplier']} />}>
              {/* Auth / Profile */}
              <Route path="/supplier/profile" element={<SupplierProfile />} />

              {/* Matching Engine */}
              <Route path="/supplier/matches" element={<MyMatches />} />

              {/* Route Optimization */}
              <Route path="/supplier/deliveries" element={<OutgoingDeliveries />} />

              {/* Inventory Management */}
              <Route path="/supplier/inventory" element={<InventoryManager />} />
              <Route path="/supplier/inventory/new" element={<PartEditor />} />
              <Route path="/supplier/inventory/:itemId/edit" element={<PartEditor />} />
              <Route path="/supplier/inventory/upload" element={<BulkUpload />} />
              <Route path="/supplier/inventory/low-stock" element={<LowStockAlerts />} />

              {/* Order Management */}
              <Route path="/supplier/orders" element={<IncomingOrders />} />
              <Route path="/supplier/orders/history" element={<SupplierOrderHistory />} />
              <Route path="/supplier/orders/:orderId" element={<OrderDetail />} />

              {/* Notifications */}
              <Route path="/supplier/notifications" element={<SupplierNotifications />} />

              {/* Analytics */}
              <Route path="/supplier/analytics" element={<SupplierDashboard />} />
              <Route path="/supplier/analytics/reports" element={<SupplierReports />} />
            </Route>

            {/* ─────────────── ADMIN ROUTES ─────────────── */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              {/* Auth / RBAC */}
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/users/:userId" element={<UserDetail />} />
              <Route path="/admin/roles" element={<RolesPermissions />} />

              {/* Matching Engine */}
              <Route path="/admin/matching/config" element={<MatchConfig />} />
              <Route path="/admin/matching/logs" element={<MatchLogs />} />

              {/* Route Optimization */}
              <Route path="/admin/routes/monitor" element={<RouteMonitor />} />
              <Route path="/admin/routes/history" element={<RouteHistory />} />

              {/* Supplier & Inventory */}
              <Route path="/admin/suppliers" element={<AllSuppliers />} />
              <Route path="/admin/suppliers/:supplierId" element={<AdminSupplierDetail />} />
              <Route path="/admin/inventory" element={<PlatformInventory />} />

              {/* Order Management */}
              <Route path="/admin/orders" element={<AllOrders />} />
              <Route path="/admin/orders/disputed" element={<DisputedOrders />} />
              <Route path="/admin/orders/:orderId" element={<OrderDetail />} />

              {/* Notifications */}
              <Route path="/admin/notifications" element={<NotificationCenter />} />
              <Route path="/admin/notifications/templates" element={<NotificationTemplates />} />

              {/* Analytics */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/analytics/reports" element={<AdminReports />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
