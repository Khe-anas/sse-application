import axios, { type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { AuthResponse } from '@/types';

const normalizeApiBaseUrl = (rawUrl?: string) => {
  const value = rawUrl?.trim();
  if (!value) {
    return '/api';
  }

  if (value.startsWith('/')) {
    return value.replace(/\/+$/, '') || '/api';
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const trimmed = withProtocol.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

const refreshApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshTokenRequest: Promise<string | null> | null = null;

const redirectToLogin = () => {
  useAuthStore.getState().logout();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      const headers = config.headers as unknown as {
        delete?: (name: string) => boolean;
        [key: string]: unknown;
      };
      if (typeof headers.delete === 'function') {
        headers.delete('Content-Type');
        headers.delete('content-type');
      }
      delete headers['Content-Type'];
      delete headers['content-type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        originalRequest._retry = true;
        refreshTokenRequest ??= refreshApi
          .post<AuthResponse>('/auth/refresh', null, {
            headers: { 'X-Refresh-Token': refreshToken },
          })
          .then((response) => {
            useAuthStore.getState().login(
              response.data.user,
              response.data.accessToken,
              response.data.refreshToken
            );
            return response.data.accessToken;
          })
          .catch(() => {
            redirectToLogin();
            return null;
          })
          .finally(() => {
            refreshTokenRequest = null;
          });

        const newToken = await refreshTokenRequest;
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      }
    }

    if (status === 401 || status === 403) {
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export default api;
