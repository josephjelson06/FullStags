export { login, register } from '@/services/api/auth';
export {
  createOrder,
  getMatches,
  updateOrder,
  getOrder,
  getRoute,
  getOrders,
} from '@/services/api/orders';
export {
  getInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updatePickTime,
} from '@/services/api/inventory';
export { getDashboard } from '@/services/api/admin';
