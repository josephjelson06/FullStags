import { useNotifications } from '@/hooks/useNotifications';

export function BuyerNotifications() {
  const { notifications, unreadCount, loading, markRead, markAllAsRead } = useNotifications();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-sm text-gray-400 mt-1">{unreadCount} unread</p>
        </div>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          onClick={() => void markAllAsRead()}
          disabled={unreadCount === 0}
        >
          Mark All Read
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">Ã°Å¸â€â€</div>
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                n.is_read
                  ? 'surface-card hover:bg-gray-50'
                  : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 hover:bg-blue-100'
              }`}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.is_read ? 'bg-transparent' : 'bg-blue-500'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium uppercase text-gray-400">{n.type}</span>
                  <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <div className="font-medium text-sm">{n.title}</div>
                <div className="text-sm text-gray-400">{n.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
