import api from './api';
import axios from 'axios';
import type { LoginRequest, AuthResponse, User } from '@/types';

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<AuthResponse['user']>('/auth/me');
    return response.data;
  },

  getMeWithToken: async (token: string): Promise<User> => {
    const response = await axios.get<AuthResponse['user']>('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};
