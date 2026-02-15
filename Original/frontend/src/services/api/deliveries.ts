import { request } from '@/services/api/client';
import type {
  AvailableAssignmentDto,
  DeliveryDto,
  DeliveryStatsDto,
} from '@/services/api/contracts';
import { toDeliveriesView, toDeliveryView } from '@/services/adapters/deliveriesAdapter';

export type Delivery = DeliveryDto;
export type DeliveryStats = DeliveryStatsDto;
export type AvailableAssignment = AvailableAssignmentDto;

export async function getDeliveries(): Promise<Delivery[]> {
  const response = await request<DeliveryDto[]>('/api/deliveries');
  return toDeliveriesView(response);
}

export async function getDelivery(deliveryId: number): Promise<Delivery> {
  const response = await request<DeliveryDto>(`/api/deliveries/${deliveryId}`);
  return toDeliveryView(response);
}

export async function createSingleDelivery(orderAssignmentId: number): Promise<Delivery> {
  const response = await request<DeliveryDto>('/api/deliveries/single', {
    method: 'POST',
    body: JSON.stringify({ order_assignment_id: orderAssignmentId }),
  });
  return toDeliveryView(response);
}

export async function createBatchDelivery(orderAssignmentIds: number[]): Promise<{
  deliveries_created: Delivery[];
  total_savings_km: number;
  total_savings_percent: number;
}> {
  const response = await request<{
    deliveries_created: DeliveryDto[];
    total_savings_km: number;
    total_savings_percent: number;
  }>('/api/deliveries/batch', {
    method: 'POST',
    body: JSON.stringify({ order_assignment_ids: orderAssignmentIds }),
  });
  return {
    ...response,
    deliveries_created: toDeliveriesView(response.deliveries_created),
  };
}

export async function getDeliveryRoute(deliveryId: number): Promise<unknown> {
  return request(`/api/deliveries/${deliveryId}/route`);
}

export async function updateDeliveryStatus(deliveryId: number, status: string): Promise<Delivery> {
  const response = await request<DeliveryDto>(`/api/deliveries/${deliveryId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return toDeliveryView(response);
}

export async function getDeliveryStats(): Promise<DeliveryStats> {
  return request<DeliveryStats>('/api/deliveries/stats');
}

export async function getAvailableAssignments(): Promise<AvailableAssignment[]> {
  return request<AvailableAssignment[]>('/api/deliveries/assignments/available');
}

export async function updateDeliveryEta(deliveryId: number): Promise<Delivery> {
  const response = await request<DeliveryDto>(`/api/deliveries/${deliveryId}/update-eta`, {
    method: 'POST',
  });
  return toDeliveryView(response);
}
