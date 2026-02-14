import { apiFetch } from "./client";
import {
  OrderAssignment,
  OrderCreatePayload,
  OrderHistoryEntry,
  OrderRecord,
  OrdersListResponse,
} from "../types/order";

export type OrdersQuery = {
  page?: number;
  pageSize?: number;
  status?: string;
  urgency?: string;
  startDate?: string;
  endDate?: string;
  buyerId?: number;
  supplierId?: number;
};

export const createOrder = (payload: OrderCreatePayload) =>
  apiFetch<OrderRecord>("/api/orders/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const listOrders = (query: OrdersQuery = {}) => {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("page_size", String(query.pageSize ?? 20));
  if (query.status) params.set("status", query.status);
  if (query.urgency) params.set("urgency", query.urgency);
  if (query.startDate) params.set("start_date", query.startDate);
  if (query.endDate) params.set("end_date", query.endDate);
  if (query.buyerId) params.set("buyer_id", String(query.buyerId));
  if (query.supplierId) params.set("supplier_id", String(query.supplierId));
  return apiFetch<OrdersListResponse>(`/api/orders/?${params.toString()}`);
};

export const getOrder = (orderId: number) => apiFetch<OrderRecord>(`/api/orders/${orderId}`);

export const transitionOrderStatus = (orderId: number, newStatus: string) =>
  apiFetch<OrderRecord>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ new_status: newStatus }),
  });

export const transitionItemStatus = (itemId: number, newStatus: string) =>
  apiFetch<OrderRecord>(`/api/orders/items/${itemId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ new_status: newStatus }),
  });

export const getOrderHistory = (orderId: number) =>
  apiFetch<OrderHistoryEntry[]>(`/api/orders/${orderId}/history`);

export const confirmAssignment = (assignmentId: number) =>
  apiFetch<OrderAssignment>(`/api/orders/assignments/${assignmentId}/confirm`, {
    method: "POST",
  });

export const rejectAssignment = (assignmentId: number) =>
  apiFetch<OrderAssignment>(`/api/orders/assignments/${assignmentId}/reject`, {
    method: "POST",
  });
