import api from './api';
import type { Organisme, PageResponse, TypeOrganisme, Evaluation } from '@/types';

export const organismeService = {
  getAll: async (params?: { type?: TypeOrganisme; search?: string; page?: number; size?: number }): Promise<PageResponse<Organisme>> => {
    const response = await api.get<PageResponse<Organisme>>('/organismes', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Organisme> => {
    const response = await api.get<Organisme>(`/organismes/${id}`);
    return response.data;
  },

  create: async (data: Partial<Organisme>): Promise<Organisme> => {
    const response = await api.post<Organisme>('/organismes', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Organisme>): Promise<Organisme> => {
    const response = await api.put<Organisme>(`/organismes/${id}`, data);
    return response.data;
  },

  updateContact: async (id: string, data: Pick<Partial<Organisme>, 'address' | 'phone' | 'email' | 'website'>): Promise<Organisme> => {
    const response = await api.patch<Organisme>(`/organismes/${id}/contact`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/organismes/${id}`);
  },

  getEvaluations: async (id: string): Promise<Evaluation[]> => {
    const response = await api.get<Evaluation[]>(`/organismes/${id}/evaluations`);
    return response.data;
  },
};
