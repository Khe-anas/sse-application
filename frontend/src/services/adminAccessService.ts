import api from './api';
import type { PermissionDefinition, Role, RoleDefinition } from '@/types';

export interface RoleDefinitionPayload {
  code?: string;
  label: string;
  description?: string;
  baseRole: Role;
  permissionCodes: string[];
  active?: boolean;
}

export const adminAccessService = {
  getRoles: async (): Promise<RoleDefinition[]> => {
    const response = await api.get<RoleDefinition[]>('/admin/access-control/roles');
    return response.data;
  },

  getPermissions: async (): Promise<PermissionDefinition[]> => {
    const response = await api.get<PermissionDefinition[]>('/admin/access-control/permissions');
    return response.data;
  },

  createRole: async (data: RoleDefinitionPayload): Promise<RoleDefinition> => {
    const response = await api.post<RoleDefinition>('/admin/access-control/roles', data);
    return response.data;
  },

  updateRole: async (id: string, data: RoleDefinitionPayload): Promise<RoleDefinition> => {
    const response = await api.put<RoleDefinition>(`/admin/access-control/roles/${id}`, data);
    return response.data;
  },
};
