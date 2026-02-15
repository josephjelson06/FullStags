export { login, me, registerBuyer, registerSupplier } from '@/services/api/auth';
export {
  createOrder,
  getMatches,
  updateOrder,
  getOrder,
  getRoute,
  getOrders,
  getOrdersEnvelope,
  transitionOrderStatus,
  transitionItemStatus,
  confirmOrderAssignment,
  rejectOrderAssignment,
} from '@/services/api/orders';
export {
  getInventory,
  getInventoryCatalog,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updatePickTime,
  uploadCatalogCsv,
  getLowStockCatalog,
  listPartCategories,
  getCatalogTransactions,
} from '@/services/api/inventory';
export { getDashboard } from '@/services/api/admin';

// Module 2 – Matching
export {
  runOrderMatching,
  runItemMatching,
  getMatchingLogs,
  getMatchConfig,
  updateMatchConfig,
  getPlacedOrders,
} from '@/services/api/matching';

// Module 3 – Deliveries / Route Optimization
export {
  getDeliveries,
  getDelivery,
  createSingleDelivery,
  createBatchDelivery,
  getDeliveryRoute,
  updateDeliveryStatus,
  getDeliveryStats,
  getAvailableAssignments,
  updateDeliveryEta,
} from '@/services/api/deliveries';

// Module 5 – Suppliers
export {
  getSuppliers,
  getMySupplierProfile,
  getNearbySuppliers,
  getSupplier,
  getSupplierCatalog,
} from '@/services/api/suppliers';

// Module 6 – Notifications
export {
  getNotifications,
  markNotificationRead,
  markAllRead,
  getNotificationTemplates,
  createNotificationTemplate,
} from '@/services/api/notifications';

// Module 7 – Analytics
export {
  getAnalyticsKpis,
  getDemandAnalytics,
  getRouteAnalytics,
  getSupplierAnalytics,
  getGeoAnalytics,
} from '@/services/api/analytics';
