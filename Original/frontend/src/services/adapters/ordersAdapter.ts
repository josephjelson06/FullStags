import type {
  BackendOrderStatus,
  DeliveryDto,
  OrderAssignmentDto,
  OrderDto,
  OrdersListDto,
} from '@/services/api/contracts';
import type { Order, RouteData, RouteLeg } from '@/types';

function firstAssignment(order: OrderDto): OrderAssignmentDto | null {
  for (const item of order.items) {
    const accepted = item.assignments.find((row) => row.status === 'ACCEPTED');
    if (accepted) {
      return accepted;
    }
    const proposed = item.assignments.find((row) => row.status === 'PROPOSED');
    if (proposed) {
      return proposed;
    }
  }
  return null;
}

function primaryPart(order: OrderDto): { name: string; number: string } {
  const firstItem = order.items[0];
  if (!firstItem) {
    return {
      name: `Order #${order.id}`,
      number: '--',
    };
  }
  return {
    name: firstItem.part_description ?? firstItem.part_number,
    number: firstItem.part_number,
  };
}

function normalizeUrgency(urgency: string): Order['urgency'] {
  if (urgency === 'critical' || urgency === 'urgent' || urgency === 'standard') {
    return urgency;
  }
  return 'standard';
}

export function toOrderView(order: OrderDto): Order {
  const supplier = firstAssignment(order);
  const part = primaryPart(order);
  return {
    id: order.id,
    orderId: String(order.id),
    status: order.status,
    urgency: normalizeUrgency(order.urgency),
    partName: part.name,
    partNumber: part.number,
    buyerCompany: order.buyer_factory_name ?? undefined,
    supplierName: supplier?.supplier_business_name ?? undefined,
    distanceKm: supplier?.distance_km ?? undefined,
    partPrice: supplier?.assigned_price ?? undefined,
    etaMinutesRemaining: undefined,
    createdAt: order.created_at ?? new Date().toISOString(),
    created_at: order.created_at ?? undefined,
    updatedAt: order.updated_at ?? undefined,
    updated_at: order.updated_at ?? undefined,
    totalItems: order.total_items,
    totalValue: order.total_value,
    buyerUserId: order.buyer_user_id ?? undefined,
    items: order.items.map((item) => ({
      id: item.id,
      orderId: item.order_id,
      categoryId: item.category_id,
      categoryName: item.category_name,
      partNumber: item.part_number,
      partDescription: item.part_description,
      quantity: item.quantity,
      status: item.status,
      assignments: item.assignments.map((assignment) => ({
        id: assignment.id,
        orderItemId: assignment.order_item_id,
        supplierId: assignment.supplier_id,
        supplierName: assignment.supplier_business_name,
        supplierUserId: assignment.supplier_user_id,
        catalogId: assignment.catalog_id,
        assignedPrice: assignment.assigned_price,
        matchScore: assignment.match_score,
        status: assignment.status,
        distanceKm: assignment.distance_km,
      })),
    })),
  };
}

export function toOrdersView(list: OrdersListDto): Order[] {
  return list.items.map(toOrderView);
}

export function filterOrdersByScope(
  orders: Order[],
  statusScope?: string,
): Order[] {
  if (!statusScope || statusScope === 'all') {
    return orders;
  }
  if (statusScope === 'active') {
    return orders.filter(
      (row) => row.status !== 'DELIVERED' && row.status !== 'CANCELLED',
    );
  }
  return orders.filter((row) => row.status === statusScope);
}

function statusToLegs(status: BackendOrderStatus): RouteLeg[] {
  const ordered: BackendOrderStatus[] = [
    'PLACED',
    'MATCHED',
    'CONFIRMED',
    'DISPATCHED',
    'IN_TRANSIT',
    'DELIVERED',
  ];
  const index = ordered.indexOf(status);
  return ordered.map((value, i) => ({
    label: value.replace('_', ' '),
    status: i <= index ? 'completed' : i === index + 1 ? 'in_progress' : 'pending',
  }));
}

function deliveryForOrder(order: OrderDto, deliveries: DeliveryDto[]): DeliveryDto | null {
  const assignmentIds = new Set<number>();
  for (const item of order.items) {
    for (const assignment of item.assignments) {
      assignmentIds.add(assignment.id);
    }
  }
  for (const delivery of deliveries) {
    const hasOrderAssignment = delivery.stops.some((stop) => {
      if (stop.order_assignment_id == null) {
        return false;
      }
      return assignmentIds.has(stop.order_assignment_id);
    });
    if (hasOrderAssignment) {
      return delivery;
    }
  }
  return null;
}

function minutesUntil(value: string | null): number {
  if (!value) {
    return 0;
  }
  const diffMs = new Date(value).getTime() - Date.now();
  return Math.max(0, Math.round(diffMs / 60000));
}

export function toRouteView(order: OrderDto, deliveries: DeliveryDto[]): RouteData | null {
  const delivery = deliveryForOrder(order, deliveries);
  const assignment = firstAssignment(order);
  if (!assignment || !delivery) {
    return null;
  }

  const pickup = delivery.stops.find((stop) => stop.stop_type.toLowerCase() === 'pickup');
  const dropoff = delivery.stops.find((stop) => stop.stop_type.toLowerCase() === 'dropoff');
  if (!pickup || !dropoff) {
    return null;
  }

  const geometryPoint = delivery.route_geometry?.coordinates?.[0];
  const courierLocation = geometryPoint
    ? { lat: geometryPoint[1], lng: geometryPoint[0] }
    : { lat: pickup.latitude, lng: pickup.longitude };

  return {
    orderId: String(order.id),
    status: order.status,
    supplierLocation: { lat: pickup.latitude, lng: pickup.longitude },
    factoryLocation: { lat: dropoff.latitude, lng: dropoff.longitude },
    courierCurrentLocation: courierLocation,
    etaMinutesRemaining: minutesUntil(delivery.latest_eta),
    legs: statusToLegs(order.status),
    deliveryId: delivery.id,
  };
}
