import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Role } from '@/types';

interface ProtectedRouteProps {
  requiredRole?: Role;
}

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

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

  if (requiredRole && user?.role !== requiredRole && user?.role !== Role.ADMIN && user?.role !== Role.SUPER_ADMIN) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
