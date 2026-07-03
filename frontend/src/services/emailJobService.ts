import api from './api';
import type { EmailJob, EmailJobStatus, PageResponse } from '@/types';

export const emailJobService = {
  getAll: async (params?: { status?: EmailJobStatus; page?: number; size?: number }): Promise<PageResponse<EmailJob>> => {
    const response = await api.get<PageResponse<EmailJob>>('/admin/email-jobs', { params });
    return response.data;
  },

  resend: async (id: string): Promise<EmailJob> => {
    const response = await api.post<EmailJob>(`/admin/email-jobs/${id}/resend`);
    return response.data;
  },
};
