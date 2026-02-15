import { request } from '@/services/api/client';

export interface DeliveryStop {
  id: number;
  stop_type: 'PICKUP' | 'DROPOFF';
  address: string;
  latitude: number;
  longitude: number;
  sequence: number;
  eta: string | null;
  completed_at: string | null;
}

export interface Delivery {
  id: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  created_by_user_id: number;
  naive_distance_km: number | null;
  optimized_distance_km: number | null;
  route_geometry: unknown | null;
  stops: DeliveryStop[];
  created_at: string;
  updated_at: string;
}

export interface DeliveryStats {
  total_deliveries: number;
  completed_deliveries: number;
  in_progress_deliveries: number;
  avg_distance_km: number;
  total_savings_km: number;
  total_savings_percent: number;
}

export interface AvailableAssignment {
  id: number;
  order_item_id: number;
  supplier_id: number;
  supplier_name: string;
  part_name: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
}

export async function getDeliveries(): Promise<Delivery[]> {
  return request<Delivery[]>('/api/deliveries');
}

export async function getDelivery(deliveryId: number): Promise<Delivery> {
  return request<Delivery>(`/api/deliveries/${deliveryId}`);
}

export async function createSingleDelivery(orderAssignmentId: number): Promise<Delivery> {
  return request<Delivery>('/api/deliveries/single', {
    method: 'POST',
    body: JSON.stringify({ order_assignment_id: orderAssignmentId }),
  });
}

export async function createBatchDelivery(orderAssignmentIds: number[]): Promise<{
  deliveries_created: Delivery[];
  total_savings_km: number;
  total_savings_percent: number;
}> {
  return request('/api/deliveries/batch', {
    method: 'POST',
    body: JSON.stringify({ order_assignment_ids: orderAssignmentIds }),
  });
}

export async function getDeliveryRoute(deliveryId: number): Promise<unknown> {
  return request(`/api/deliveries/${deliveryId}/route`);
}

export async function updateDeliveryStatus(deliveryId: number, status: string): Promise<Delivery> {
  return request<Delivery>(`/api/deliveries/${deliveryId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getDeliveryStats(): Promise<DeliveryStats> {
  return request<DeliveryStats>('/api/deliveries/stats');
}

export async function getAvailableAssignments(): Promise<AvailableAssignment[]> {
  return request<AvailableAssignment[]>('/api/deliveries/assignments/available');
}

export async function updateDeliveryEta(deliveryId: number): Promise<Delivery> {
  return request<Delivery>(`/api/deliveries/${deliveryId}/update-eta`, {
    method: 'POST',
  });
}
