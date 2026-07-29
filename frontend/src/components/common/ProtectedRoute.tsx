import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Role } from '@/types';

interface ProtectedRouteProps {
  requiredRole?: Role;
  requiredPermission?: string;
  systemAdminOnly?: boolean;
}

export default function ProtectedRoute({ requiredRole, requiredPermission, systemAdminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const legacyAdminSession = user?.role === Role.ADMIN
    && user.systemAdmin == null
    && user.permissions == null;
  const hasSystemAccess = Boolean(user?.systemAdmin || legacyAdminSession);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole && !hasSystemAccess) {
    return <Navigate to="/" replace />;
  }

  if (systemAdminOnly && !hasSystemAccess) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasSystemAccess && !user?.permissions?.includes(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
