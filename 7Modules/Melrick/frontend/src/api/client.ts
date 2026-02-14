import {
  AvailableAssignment,
  DeliveryResponse,
  DeliveryStats,
  VRPBatchResult,
} from "../types/delivery";
import {
  AnalyticsSnapshot,
  DeliveryAnalytics,
  EventTimelinePoint,
  InventoryRiskItem,
  KPIOverview,
  MatchingAnalytics,
  StatusCount,
  SupplierPerformance,
} from "../types/analytics";
import { MatchLogEntry, MatchResult, OrderSummary, WeightProfiles } from "../types/matching";

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const fetchPlacedOrders = () => request<OrderSummary[]>("/api/matching/orders/placed");

export const runOrderMatching = (orderId: number) =>
  request<MatchResult[]>(`/api/matching/order/${orderId}`, { method: "POST" });

export const runItemMatching = (itemId: number) =>
  request<MatchResult>(`/api/matching/item/${itemId}`, { method: "POST" });

export const getMatchLogs = (orderItemId: number) =>
  request<MatchLogEntry[]>(`/api/matching/logs/${orderItemId}`);

export const getMatchingConfig = () =>
  request<{ weight_profiles: WeightProfiles }>("/api/matching/config");

export const updateMatchingConfig = (weight_profiles: WeightProfiles) =>
  request<{ weight_profiles: WeightProfiles }>("/api/matching/config", {
    method: "PUT",
    body: JSON.stringify({ weight_profiles }),
  });

export const fetchAvailableAssignments = () =>
  request<AvailableAssignment[]>("/api/deliveries/assignments/available");

export const createSingleDelivery = (order_assignment_id: number) =>
  request<DeliveryResponse>("/api/deliveries/single", {
    method: "POST",
    body: JSON.stringify({ order_assignment_id }),
  });

export const createBatchDelivery = (order_assignment_ids: number[]) =>
  request<VRPBatchResult>("/api/deliveries/batch", {
    method: "POST",
    body: JSON.stringify({ order_assignment_ids }),
  });

export const fetchDeliveries = () => request<DeliveryResponse[]>("/api/deliveries/");

export const fetchDeliveryById = (deliveryId: number) =>
  request<DeliveryResponse>(`/api/deliveries/${deliveryId}`);

export const fetchDeliveryRoute = (deliveryId: number) =>
  request<{ type: string; coordinates: number[][] }>(`/api/deliveries/${deliveryId}/route`);

export const updateDeliveryStatus = (
  deliveryId: number,
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED"
) =>
  request<DeliveryResponse>(`/api/deliveries/${deliveryId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const triggerDeliveryEtaUpdate = (deliveryId: number) =>
  request<DeliveryResponse>(`/api/deliveries/${deliveryId}/update-eta`, {
    method: "POST",
  });

export const fetchDeliveryStats = () => request<DeliveryStats>("/api/deliveries/stats");

export const fetchAnalyticsOverview = () =>
  request<KPIOverview>("/api/analytics/overview");

export const fetchAnalyticsOrderStatus = () =>
  request<StatusCount[]>("/api/analytics/orders/status-distribution");

export const fetchAnalyticsMatching = () =>
  request<MatchingAnalytics>("/api/analytics/matching/quality");

export const fetchAnalyticsDeliveries = () =>
  request<DeliveryAnalytics>("/api/analytics/deliveries/efficiency");

export const fetchAnalyticsSuppliers = () =>
  request<SupplierPerformance[]>("/api/analytics/suppliers/performance");

export const fetchAnalyticsLowStock = (limit = 20) =>
  request<InventoryRiskItem[]>(`/api/analytics/inventory/low-stock?limit=${limit}`);

export const fetchAnalyticsTimeline = (days = 14) =>
  request<EventTimelinePoint[]>(`/api/analytics/events/timeline?days=${days}`);

export const fetchAnalyticsSnapshot = (days = 14) =>
  request<AnalyticsSnapshot>(`/api/analytics/snapshot?days=${days}`);
