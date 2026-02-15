import { useEffect, useState } from 'react';
import {
  getNotifications,
  markNotificationRead,
  markAllRead,
  type Notification,
} from '@/services/api/notifications';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAll = async () => {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Center</h1>
          <p className="text-sm text-gray-500 mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={() => void markAll()}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </button>
          <button
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No notifications yet.</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-4 flex items-start gap-4 ${
                n.is_read
                  ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                  : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30'
              }`}
            >
              <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                n.is_read ? 'bg-transparent' : 'bg-blue-500'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-gray-400">{n.type}</span>
                  <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <div className="font-medium text-sm mt-1">{n.title}</div>
                <div className="text-sm text-gray-500 mt-0.5">{n.message}</div>
              </div>
              {!n.is_read && (
                <button
                  className="flex-shrink-0 rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                  onClick={() => void markRead(n.id)}
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
