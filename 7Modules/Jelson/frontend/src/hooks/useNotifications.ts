import { useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../api/client";
import useSocket from "./useSocket";
import useNotificationStore from "../stores/notificationStore";
import useAuthStore from "../stores/authStore";
import type {
  NotificationItem,
  NotificationListResponse,
  SocketEventPayload,
  UnreadCountResponse,
} from "../types";

const fallbackNotificationId = () => -Math.floor(Date.now() + Math.random() * 10000);

const useNotifications = () => {
  const socket = useSocket();
  const currentUser = useAuthStore((state) => state.user);
  const {
    notifications,
    unreadCount,
    initialized,
    setInitial,
    prependNotification,
    markReadLocal,
    markAllReadLocal,
    setUnreadCount,
  } = useNotificationStore();

  const fetchInitialNotifications = useCallback(async () => {
    const [listResponse, unreadResponse] = await Promise.all([
      api.get<NotificationListResponse>("/notifications/", {
        params: { limit: 30, offset: 0 },
      }),
      api.get<UnreadCountResponse>("/notifications/unread-count"),
    ]);

    setInitial(listResponse.data.items, unreadResponse.data.count);
  }, [setInitial]);

  useEffect(() => {
    if (!initialized) {
      void fetchInitialNotifications();
    }
  }, [initialized, fetchInitialNotifications]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleNotification = (payload: SocketEventPayload) => {
      const notification: NotificationItem = {
        id: payload.notification_id ?? fallbackNotificationId(),
        user_id: payload.user_id ?? currentUser?.user_id ?? 0,
        event_type: payload.event_type,
        title: payload.title,
        message: payload.message,
        is_read: false,
        metadata: payload.metadata ?? null,
        created_at: payload.created_at ?? payload.timestamp,
      };
      prependNotification(notification);
      toast.success(`${payload.title}: ${payload.message}`);
    };

    socket.on("notification", handleNotification);
    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, currentUser?.user_id, prependNotification]);

  const markAsRead = useCallback(
    async (notificationId: number) => {
      if (notificationId > 0) {
        await api.patch(`/notifications/${notificationId}/read`);
      }
      markReadLocal(notificationId);
      if (notificationId <= 0) {
        const response = await api.get<UnreadCountResponse>("/notifications/unread-count");
        setUnreadCount(response.data.count);
      }
    },
    [markReadLocal, setUnreadCount],
  );

  const markAllRead = useCallback(async () => {
    await api.patch("/notifications/read-all");
    markAllReadLocal();
  }, [markAllReadLocal]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllRead,
    refresh: fetchInitialNotifications,
  };
};

export default useNotifications;
