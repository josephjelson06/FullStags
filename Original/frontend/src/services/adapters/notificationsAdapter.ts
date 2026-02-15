import type { NotificationListDto } from '@/services/api/contracts';
import type { Notification } from '@/services/api/notifications';

function eventTypeToCategory(eventType: string): string {
  if (eventType.startsWith('ORDER_')) {
    return 'ORDER';
  }
  if (eventType.includes('DELIVERY') || eventType === 'ETA_UPDATED') {
    return 'SYSTEM';
  }
  if (eventType.includes('LOW_STOCK')) {
    return 'WARNING';
  }
  return 'SYSTEM';
}

export function toNotificationItems(dto: NotificationListDto): Notification[] {
  return dto.items.map((item) => ({
    id: item.id,
    user_id: item.user_id,
    type: eventTypeToCategory(item.event_type),
    event_type: item.event_type,
    title: item.title,
    message: item.message,
    data: item.metadata ?? {},
    is_read: item.is_read,
    created_at: item.created_at,
  }));
}
