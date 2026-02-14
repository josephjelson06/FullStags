import { request } from '@/services/api/client';
import type {
  CreateOrderInput,
  MatchResponse,
  Order,
  OrderAction,
  OrdersResponse,
  RouteData,
  SupplierMatch,
  UpdateOrderResponse,
} from '@/types';

export async function createOrder(data: CreateOrderInput): Promise<Order> {
  return request<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMatches(orderId: string): Promise<SupplierMatch[]> {
  const response = await request<MatchResponse>(`/api/orders/${orderId}/matches`);
  return response.matches;
}

export async function updateOrder(orderId: string, action: OrderAction, matchId?: string): Promise<UpdateOrderResponse> {
  return request<UpdateOrderResponse>(`/api/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, matchId }),
  });
}

export async function getOrder(orderId: string): Promise<Order> {
  return request<Order>(`/api/orders/${orderId}`);
}

export async function getRoute(orderId: string): Promise<RouteData> {
  return request<RouteData>(`/api/orders/${orderId}/route`);
}

export async function getOrders(status?: string, page = 1, pageSize = 20): Promise<Order[]> {
  const params = new URLSearchParams();
  if (status) {
    params.set('status', status);
  }
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await request<OrdersResponse>(`/api/orders${query}`);
  const compatResponse = response as OrdersResponse & { items?: Order[] };
  if (Array.isArray(compatResponse.orders)) {
    return compatResponse.orders;
  }
  return Array.isArray(compatResponse.items) ? compatResponse.items : [];
}
