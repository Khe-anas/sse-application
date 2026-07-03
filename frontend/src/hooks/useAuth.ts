import { useAuthStore } from '@/stores/authStore';
import { Role } from '@/types';

export function useAuth() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isSuperAdmin: user?.role === Role.SUPER_ADMIN,
    isAdmin: user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN,
    isResponsable: user?.role === Role.RESPONSABLE,
    isGouvernement: user?.role === Role.GOUVERNEMENT,
    hasRole: (role: Role) => user?.role === role,
    logout,
  };
}
