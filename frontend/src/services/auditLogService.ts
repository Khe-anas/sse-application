import api from './api';
import type { AuditLog, PageResponse } from '@/types';

export const auditLogService = {
  getAll: async (params?: {
    action?: string;
    entity?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<AuditLog>> => {
    const response = await api.get<PageResponse<AuditLog>>('/admin/audit-logs', { params });
    return response.data;
  },
};
