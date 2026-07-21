import api from './api';
import type { User, PageResponse, Role, UserStatus } from '@/types';

export const userService = {
  getAll: async (params?: { role?: Role; status?: UserStatus; search?: string; page?: number; size?: number }): Promise<PageResponse<User>> => {
    const response = await api.get<PageResponse<User>>('/admin/users', { params });
    return response.data;
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    const response = await api.post<User>('/admin/users', data);
    return response.data;
  },

  update: async (id: string, data: UpdateUserRequest): Promise<User> => {
    const response = await api.put<User>(`/admin/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  generatePassword: async (id: string): Promise<void> => {
    await api.put(`/admin/users/${id}/generate-password`);
  },
};

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: Role;
  password?: string;
  phone?: string;
  position?: string;
  organismeId?: string;
  isActive?: boolean;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role?: Role;
  password?: string;
  phone?: string;
  position?: string;
  organismeId?: string;
}
