import { create } from 'zustand';
import { notificationService } from '@/services/notificationService';
import type { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const data = await notificationService.getAll({ size: 20 });
      set({
        notifications: data.content || [],
      });
      get().fetchUnreadCount();
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const unreadCount = await notificationService.getUnreadCount();
      set({ unreadCount });
    } catch (error) {
      console.error('Failed to fetch unread notification count', error);
    }
  },

  markAsRead: async (id) => {
    await notificationService.markAsRead(id);
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    set({ notifications: updated });
    get().fetchUnreadCount();
  },

  markAllAsRead: async () => {
    await notificationService.markAllAsRead();
    const updated = get().notifications.map((n) => ({ ...n, isRead: true }));
    set({ notifications: updated, unreadCount: 0 });
  },

  deleteNotification: async (id) => {
    await notificationService.delete(id);
    const updated = get().notifications.filter((n) => n.id !== id);
    set({
      notifications: updated,
      unreadCount: updated.filter((n: Notification) => !n.isRead).length,
    });
    get().fetchUnreadCount();
  },
}));
