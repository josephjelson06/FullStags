import { request } from '@/services/api/client';
import type {
  BackendOrderStatus,
  DeliveryDto,
  OrderCreateDto,
  OrderDto,
  OrderHistoryDto,
  OrdersListDto,
  StatusTransitionDto,
} from '@/services/api/contracts';
import { toOrderView, toOrdersView, toRouteView, filterOrdersByScope } from '@/services/adapters/ordersAdapter';
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

function toOrderItemCreate(
  item: CreateOrderInput['items'][number] | OrderCreateDto['items'][number],
): OrderCreateDto['items'][number] {
  if ('categoryId' in item) {
    return {
      category_id: item.categoryId,
      part_number: item.partNumber,
      part_description: item.partDescription,
      quantity: item.quantity,
    };
  }
  return {
    category_id: item.category_id,
    part_number: item.part_number,
    part_description: item.part_description,
    quantity: item.quantity,
  };
}

function toBackendOrderCreate(payload: CreateOrderInput | OrderCreateDto): OrderCreateDto {
  if ('items' in payload && Array.isArray(payload.items)) {
    const items = payload.items.map(toOrderItemCreate);

    if (items.some((item) => !item.category_id || !item.part_number || item.quantity <= 0)) {
      throw new Error('Each order item requires category, part number, and quantity.');
    }

    return {
      items,
      urgency: payload.urgency,
    };
  }

  throw new Error('Order creation payload is invalid.');
}

function toStatusPayload(status: BackendOrderStatus): StatusTransitionDto {
  return { new_status: status };
}

export async function createOrder(data: CreateOrderInput | OrderCreateDto): Promise<Order> {
  const response = await request<OrderDto>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(toBackendOrderCreate(data)),
  });
  return toOrderView(response);
}

export async function getOrder(orderId: string | number): Promise<Order> {
  const response = await request<OrderDto>(`/api/orders/${orderId}`);
  return toOrderView(response);
}

export async function getOrderRaw(orderId: string | number): Promise<OrderDto> {
  return request<OrderDto>(`/api/orders/${orderId}`);
}

export async function getOrderHistory(orderId: string | number): Promise<OrderHistoryDto[]> {
  return request<OrderHistoryDto[]>(`/api/orders/${orderId}/history`);
}

export async function getOrders(
  status?: string,
  page = 1,
  pageSize = 100,
): Promise<Order[]> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  if (status && status !== 'all' && status !== 'active') {
    params.set('status', status);
  }

  const response = await request<OrdersListDto>(`/api/orders?${params.toString()}`);
  return filterOrdersByScope(toOrdersView(response), status);
}

export async function getOrdersEnvelope(
  status?: string,
  page = 1,
  pageSize = 100,
): Promise<OrdersResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  if (status && status !== 'all' && status !== 'active') {
    params.set('status', status);
  }
  const response = await request<OrdersListDto>(`/api/orders?${params.toString()}`);
  const items = filterOrdersByScope(toOrdersView(response), status);
  return {
    items,
    orders: items,
    page: response.page,
    page_size: response.page_size,
    total: response.total,
  };
}

export async function transitionOrderStatus(orderId: number | string, newStatus: BackendOrderStatus): Promise<Order> {
  const response = await request<OrderDto>(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(toStatusPayload(newStatus)),
  });
  return toOrderView(response);
}

export async function transitionItemStatus(itemId: number, newStatus: BackendOrderStatus): Promise<Order> {
  const response = await request<OrderDto>(`/api/orders/items/${itemId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(toStatusPayload(newStatus)),
  });
  return toOrderView(response);
}

export async function confirmOrderAssignment(assignmentId: number): Promise<void> {
  await request(`/api/orders/assignments/${assignmentId}/confirm`, {
    method: 'POST',
  });
}

export async function rejectOrderAssignment(assignmentId: number): Promise<void> {
  await request(`/api/orders/assignments/${assignmentId}/reject`, {
    method: 'POST',
  });
}

function mapAssignmentsToMatches(order: Order): SupplierMatch[] {
  const matches: SupplierMatch[] = [];
  for (const item of order.items) {
    for (const assignment of item.assignments) {
      matches.push({
        matchId: String(assignment.id),
        supplierId: String(assignment.supplierId),
        supplierName: assignment.supplierName ?? 'Supplier',
        distanceKm: assignment.distanceKm ?? 0,
        pickTimeMinutes: 0,
        driveTimeMinutes: 0,
        totalTimeMinutes: 0,
        partPrice: assignment.assignedPrice ?? 0,
        supplierLocation: {
          lat: 0,
          lng: 0,
          address: '',
        },
      });
    }
  }
  return matches;
}

export async function getMatches(orderId: string): Promise<SupplierMatch[]> {
  const order = await getOrder(orderId);
  return mapAssignmentsToMatches(order);
}

export async function updateOrder(orderId: string, action: OrderAction, matchId?: string): Promise<UpdateOrderResponse> {
  if (action === 'cancel') {
    const updated = await transitionOrderStatus(orderId, 'CANCELLED');
    return { orderId: updated.orderId, status: updated.status };
  }
  if (action === 'delivered') {
    const updated = await transitionOrderStatus(orderId, 'DELIVERED');
    return { orderId: updated.orderId, status: updated.status };
  }
  if (action === 'accept' && matchId) {
    await confirmOrderAssignment(Number(matchId));
    const updated = await getOrder(orderId);
    return { orderId: updated.orderId, status: updated.status };
  }
  if (action === 'decline' && matchId) {
    await rejectOrderAssignment(Number(matchId));
    const updated = await getOrder(orderId);
    return { orderId: updated.orderId, status: updated.status };
  }
  throw new Error(`Unsupported action "${action}" for backend v2 contract.`);
}

export async function getRoute(orderId: string): Promise<RouteData> {
  const [order, deliveries] = await Promise.all([
    request<OrderDto>(`/api/orders/${orderId}`),
    request<DeliveryDto[]>('/api/deliveries'),
  ]);
  const route = toRouteView(order, deliveries);
  if (!route) {
    throw new Error('Route is not available for this order yet.');
  }
  return route;
}

export async function getMatchesEnvelope(orderId: string): Promise<MatchResponse> {
  const matches = await getMatches(orderId);
  return { orderId, matches };
}
