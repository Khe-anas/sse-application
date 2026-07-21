import api from './api';
import type { BonnePratique, Critere, Principe } from '@/types';

export interface ReferenceTranslationResponse {
  fields: Record<string, { en: string; ar: string }>;
  provider: string;
}

export const referenceDataService = {
  getAll: async (): Promise<Principe[]> => {
    const response = await api.get<Principe[]>('/principes');
    return response.data;
  },

  createPrincipe: async (data: Record<string, string>): Promise<Principe> => {
    const response = await api.post<Principe>('/principes', data);
    return response.data;
  },

  updatePrincipe: async (id: string, data: Record<string, string>): Promise<Principe> => {
    const response = await api.put<Principe>(`/principes/${id}`, data);
    return response.data;
  },

  deletePrincipe: async (id: string): Promise<void> => {
    await api.delete(`/principes/${id}`);
  },

  createBonnePratique: async (data: Record<string, string> & { principeId: string }): Promise<BonnePratique> => {
    const response = await api.post<BonnePratique>('/principes/bonnes-pratiques', data);
    return response.data;
  },

  updateBonnePratique: async (id: string, data: Record<string, string>): Promise<BonnePratique> => {
    const response = await api.put<BonnePratique>(`/principes/bonnes-pratiques/${id}`, data);
    return response.data;
  },

  deleteBonnePratique: async (id: string): Promise<void> => {
    await api.delete(`/principes/bonnes-pratiques/${id}`);
  },

  createCritere: async (data: Record<string, string> & { bonnePratiqueId: string }): Promise<Critere> => {
    const response = await api.post<Critere>('/principes/criteres', data);
    return response.data;
  },

  updateCritere: async (id: string, data: Record<string, string>): Promise<Critere> => {
    const response = await api.put<Critere>(`/principes/criteres/${id}`, data);
    return response.data;
  },

  deleteCritere: async (id: string): Promise<void> => {
    await api.delete(`/principes/criteres/${id}`);
  },

  translateDraft: async (fields: Record<string, string>): Promise<ReferenceTranslationResponse> => {
    const response = await api.post<ReferenceTranslationResponse>('/principes/translate', { fields });
    return response.data;
  },
};
