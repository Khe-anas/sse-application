import { useAuthStore } from '@/stores/authStore';
import { Role } from '@/types';

export function useAuth() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isAdmin: user?.role === Role.ADMIN,
    isResponsable: user?.role === Role.RESPONSABLE,
    isGouvernement: user?.role === Role.GOUVERNEMENT,
    hasRole: (role: Role) => user?.role === role,
    logout,
  };
}
