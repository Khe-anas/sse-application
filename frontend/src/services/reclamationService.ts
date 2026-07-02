import api from './api';
import type { PageResponse, Reclamation, ReclamationStatus } from '@/types';

export interface SubmitReclamationForm {
  subject: string;
  message: string;
}

export const reclamationService = {
  submit: async (data: SubmitReclamationForm): Promise<Reclamation> => {
    const response = await api.post<Reclamation>('/reclamations', data);
    return response.data;
  },

  getAll: async (params?: {
    status?: ReclamationStatus;
    search?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<Reclamation>> => {
    const response = await api.get<PageResponse<Reclamation>>('/admin/reclamations', { params });
    return response.data;
  },

  claim: async (id: string): Promise<Reclamation> => {
    const response = await api.put<Reclamation>(`/admin/reclamations/${id}/claim`);
    return response.data;
  },

  resolve: async (id: string, adminResponse?: string): Promise<Reclamation> => {
    const response = await api.put<Reclamation>(`/admin/reclamations/${id}/resolve`, { adminResponse });
    return response.data;
  },
};
