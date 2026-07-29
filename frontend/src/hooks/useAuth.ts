import { useAuthStore } from '@/stores/authStore';
import { Role } from '@/types';

export function useAuth() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isAdmin: user?.role === Role.ADMIN,
    isUser: user?.role === Role.USER,
    isEvaluateure: user?.role === Role.EVALUATEUR,
    isGouvernement: user?.role === Role.GOUVERNEMENT,
    isSystemAdmin: Boolean(user?.systemAdmin),
    hasRole: (role: Role) => user?.role === role,
    hasPermission: (permission: string) => Boolean(
      user?.systemAdmin || user?.permissions?.includes(permission),
    ),
    logout,
  };
}
