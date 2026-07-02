import api from './api';
import type { User, PageResponse, Role } from '@/types';

export const userService = {
  getAll: async (params?: { role?: Role; search?: string; page?: number; size?: number }): Promise<PageResponse<User>> => {
    const response = await api.get<PageResponse<User>>('/admin/users', { params });
    return response.data;
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    const response = await api.post<User>('/admin/users', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateUserRequest>): Promise<User> => {
    const response = await api.put<User>(`/admin/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },
};

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  password?: string;
  phone?: string;
  organismeId?: string;
  entrepriseName?: string;
}
