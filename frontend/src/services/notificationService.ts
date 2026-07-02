import api from './api';
import type { Notification, PageResponse, Role } from '@/types';

export interface AdminNotificationRequest {
  titleFr: string;
  messageFr: string;
  titleAr?: string;
  titleEn?: string;
  messageAr?: string;
  messageEn?: string;
  link?: string;
  roles?: Role[];
  recipientUserIds?: string[];
}

export const notificationService = {
  getAll: async (params?: { page?: number; size?: number }): Promise<PageResponse<Notification>> => {
    const response = await api.get<PageResponse<Notification>>('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{ count: number }>('/notifications/unread-count');
    return response.data.count;
  },

  markAsRead: async (id: string): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },

  sendAnnouncement: async (data: AdminNotificationRequest): Promise<number> => {
    const response = await api.post<{ sent: number }>('/notifications/admin/announcements', data);
    return response.data.sent;
  },

  sendMessage: async (data: AdminNotificationRequest): Promise<number> => {
    const response = await api.post<{ sent: number }>('/notifications/admin/messages', data);
    return response.data.sent;
  },
};
