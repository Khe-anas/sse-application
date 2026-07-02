import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Role } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  setToken: (token: string, refreshToken?: string) => void;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  hasRole: (role: Role) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user }),
      setToken: (token, refreshToken) =>
        set((state) => ({ token, refreshToken: refreshToken ?? state.refreshToken })),

      login: (user, token, refreshToken) =>
        set({ user, token, refreshToken, isAuthenticated: true, isLoading: false }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false }),

      setLoading: (loading) => set({ isLoading: loading }),

      hasRole: (role) => get().user?.role === role,
    }),
    {
      name: 'sse-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
