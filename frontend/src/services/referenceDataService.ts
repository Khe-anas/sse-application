import api from './api';
import type { Principe } from '@/types';

export const referenceDataService = {
  getAll: async (): Promise<Principe[]> => {
    const response = await api.get<Principe[]>('/principes');
    return response.data;
  },

  createPrincipe: async (data: { nameFr: string; nameAr?: string; nameEn?: string; weight?: number }): Promise<Principe> => {
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

  createBonnePratique: async (data: { principeId: string; labelFr: string; labelAr?: string; labelEn?: string }): Promise<any> => {
    const response = await api.post('/principes/bonnes-pratiques', data);
    return response.data;
  },

  updateBonnePratique: async (id: string, data: Record<string, string>): Promise<any> => {
    const response = await api.put(`/principes/bonnes-pratiques/${id}`, data);
    return response.data;
  },

  deleteBonnePratique: async (id: string): Promise<void> => {
    await api.delete(`/principes/bonnes-pratiques/${id}`);
  },

  createCritere: async (data: { bonnePratiqueId: string; labelFr: string; labelAr?: string; labelEn?: string; preuvesFr?: string; preuvesAr?: string; preuvesEn?: string; referencesFr?: string; referencesAr?: string; referencesEn?: string }): Promise<any> => {
    const response = await api.post('/principes/criteres', data);
    return response.data;
  },

  updateCritere: async (id: string, data: Record<string, string>): Promise<any> => {
    const response = await api.put(`/principes/criteres/${id}`, data);
    return response.data;
  },

  deleteCritere: async (id: string): Promise<void> => {
    await api.delete(`/principes/criteres/${id}`);
  },
};
