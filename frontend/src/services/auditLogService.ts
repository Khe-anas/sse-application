import api from './api';
import type { AuditLog, PageResponse } from '@/types';

export const auditLogService = {
  exportPdf: async (params?: {
    action?: string;
    entity?: string;
    userId?: string;
    role?: string;
    from?: string;
    to?: string;
  }): Promise<Blob> => {
    const response = await api.get('/admin/audit-logs/export/pdf', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  getAll: async (params?: {
    action?: string;
    entity?: string;
    userId?: string;
    role?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<AuditLog>> => {
    const response = await api.get<PageResponse<AuditLog>>('/admin/audit-logs', { params });
    return response.data;
  },
};
