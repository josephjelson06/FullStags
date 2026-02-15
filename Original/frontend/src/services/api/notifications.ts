import { request } from '@/services/api/client';
import type {
  MarkAllReadDto,
  NotificationListDto,
  NotificationTemplateDto,
} from '@/services/api/contracts';
import { toNotificationItems } from '@/services/adapters/notificationsAdapter';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  event_type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export type NotificationTemplate = NotificationTemplateDto;

export async function getNotifications(unreadOnly = false): Promise<Notification[]> {
  const query = unreadOnly ? '?is_read=false' : '';
  const response = await request<NotificationListDto>(`/api/notifications${query}`);
  return toNotificationItems(response);
}

export async function getNotificationsEnvelope(
  unreadOnly = false,
  limit = 20,
  offset = 0,
): Promise<NotificationListDto> {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (unreadOnly) {
    params.set('is_read', 'false');
  }
  return request<NotificationListDto>(`/api/notifications?${params.toString()}`);
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  await request(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}

export async function markAllRead(): Promise<MarkAllReadDto> {
  return request<MarkAllReadDto>('/api/notifications/read-all', {
    method: 'PATCH',
  });
}

export async function getNotificationTemplates(): Promise<NotificationTemplate[]> {
  return request<NotificationTemplate[]>('/api/notifications/templates');
}

export async function createNotificationTemplate(template: {
  name: string;
  type: string;
  subject: string;
  body: string;
}): Promise<NotificationTemplate> {
  return request<NotificationTemplate>('/api/notifications/templates', {
    method: 'POST',
    body: JSON.stringify(template),
  });
}
