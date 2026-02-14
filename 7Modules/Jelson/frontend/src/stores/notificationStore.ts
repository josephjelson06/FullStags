import { create } from "zustand";
import type { NotificationItem } from "../types";

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  initialized: boolean;
  reset: () => void;
  setInitial: (notifications: NotificationItem[], unreadCount: number) => void;
  prependNotification: (notification: NotificationItem) => void;
  markReadLocal: (notificationId: number) => void;
  markAllReadLocal: () => void;
  setUnreadCount: (count: number) => void;
}

const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  initialized: false,
  reset: () => set({ notifications: [], unreadCount: 0, initialized: false }),
  setInitial: (notifications, unreadCount) =>
    set({
      notifications,
      unreadCount,
      initialized: true,
    }),
  prependNotification: (notification) =>
    set((state) => {
      const exists = state.notifications.some((item) => item.id === notification.id);
      if (exists) {
        return state;
      }
      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
      };
    }),
  markReadLocal: (notificationId) =>
    set((state) => {
      let changed = false;
      const notifications = state.notifications.map((item) => {
        if (item.id === notificationId && !item.is_read) {
          changed = true;
          return { ...item, is_read: true };
        }
        return item;
      });
      return {
        notifications,
        unreadCount: changed ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }),
  markAllReadLocal: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({ ...item, is_read: true })),
      unreadCount: 0,
    })),
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
}));

export default useNotificationStore;
