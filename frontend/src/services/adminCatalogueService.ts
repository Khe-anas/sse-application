import api from './api';
import type {
  SecteurDefinition,
  TypeOrganismeDefinition,
} from '@/types';

export interface TypeOrganismePayload {
  code?: string;
  label: string;
  description?: string;
  active?: boolean;
}

export interface SecteurPayload {
  code?: string;
  label: string;
  description?: string;
  active?: boolean;
}

export const adminCatalogueService = {
  getTypes: async (activeOnly = false): Promise<TypeOrganismeDefinition[]> => {
    const response = await api.get<TypeOrganismeDefinition[]>('/admin/catalogues/types-organisme', {
      params: { activeOnly },
    });
    return response.data;
  },

  createType: async (data: TypeOrganismePayload): Promise<TypeOrganismeDefinition> => {
    const response = await api.post<TypeOrganismeDefinition>('/admin/catalogues/types-organisme', data);
    return response.data;
  },

  updateType: async (id: string, data: TypeOrganismePayload): Promise<TypeOrganismeDefinition> => {
    const response = await api.put<TypeOrganismeDefinition>(`/admin/catalogues/types-organisme/${id}`, data);
    return response.data;
  },

  getSectors: async (activeOnly = false): Promise<SecteurDefinition[]> => {
    const response = await api.get<SecteurDefinition[]>('/admin/catalogues/secteurs', {
      params: { activeOnly },
    });
    return response.data;
  },

  createSector: async (data: SecteurPayload): Promise<SecteurDefinition> => {
    const response = await api.post<SecteurDefinition>('/admin/catalogues/secteurs', data);
    return response.data;
  },

  updateSector: async (id: string, data: SecteurPayload): Promise<SecteurDefinition> => {
    const response = await api.put<SecteurDefinition>(`/admin/catalogues/secteurs/${id}`, data);
    return response.data;
  },
};

export const catalogueService = {
  getTypes: async (): Promise<TypeOrganismeDefinition[]> => {
    const response = await api.get<TypeOrganismeDefinition[]>('/catalogues/types-organisme');
    return response.data;
  },

  getSectors: async (): Promise<SecteurDefinition[]> => {
    const response = await api.get<SecteurDefinition[]>('/catalogues/secteurs');
    return response.data;
  },
};
