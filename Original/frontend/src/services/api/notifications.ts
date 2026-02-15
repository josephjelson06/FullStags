import { request } from '@/services/api/client';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  type: string;
  subject: string;
  body: string;
  created_at: string;
}

export async function getNotifications(unreadOnly = false): Promise<Notification[]> {
  const query = unreadOnly ? '?unread=true' : '';
  return request<Notification[]>(`/api/notifications${query}`);
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  await request(`/api/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}

export async function markAllRead(): Promise<void> {
  await request('/api/notifications/read-all', {
    method: 'POST',
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
