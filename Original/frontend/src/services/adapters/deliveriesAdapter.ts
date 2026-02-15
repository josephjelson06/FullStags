import type { DeliveryDto } from '@/services/api/contracts';

export function normalizeDeliveryStatus(status: string): 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' {
  if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
    return status;
  }
  return 'PLANNED';
}

export function toDeliveryView(delivery: DeliveryDto): DeliveryDto {
  return {
    ...delivery,
    status: normalizeDeliveryStatus(delivery.status),
  };
}

export function toDeliveriesView(deliveries: DeliveryDto[]): DeliveryDto[] {
  return deliveries.map(toDeliveryView);
}
