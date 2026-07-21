import api from './api';
import type { User, PageResponse, Role, TypeOrganisme, UserStatus } from '@/types';

export const userService = {
  getAll: async (params?: { role?: Role; status?: UserStatus; search?: string; page?: number; size?: number }): Promise<PageResponse<User>> => {
    const response = await api.get<PageResponse<User>>('/admin/users', { params });
    return response.data;
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    const response = await api.post<User>('/admin/users', data);
    return response.data;
  },

  createWithOrganisme: async (data: CreateUserWithOrganismeRequest): Promise<User> => {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('firstName', data.firstName);
    formData.append('lastName', data.lastName);
    formData.append('organisationName', data.organisationName);
    formData.append('organisationType', data.organisationType);
    formData.append('logo', data.logo);

    if (data.password) formData.append('password', data.password);
    if (data.phone) formData.append('phone', data.phone);
    if (data.position) formData.append('position', data.position);
    if (data.sector) formData.append('sector', data.sector);
    if (data.address) formData.append('address', data.address);
    if (data.organisationEmail) formData.append('organisationEmail', data.organisationEmail);
    if (data.organisationPhone) formData.append('organisationPhone', data.organisationPhone);
    if (data.fax) formData.append('fax', data.fax);
    if (data.website) formData.append('website', data.website);

    const response = await api.post<User>('/admin/users/with-organisme', formData);
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

export interface CreateUserWithOrganismeRequest {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  phone?: string;
  position?: string;
  organisationName: string;
  organisationType: TypeOrganisme;
  sector?: string;
  address?: string;
  organisationEmail?: string;
  organisationPhone?: string;
  fax?: string;
  website?: string;
  logo: File;
}
