import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { changeLanguage } from '@/i18n';
import { Role } from '@/types';

// Layout
import AppLayout from '@/components/layout/AppLayout';

// Auth
import LoginPage from '@/pages/auth/LoginPage';
import AccountRequestPage from '@/pages/auth/AccountRequestPage';
import ActivateAccountPage from '@/pages/auth/ActivateAccountPage';
import EvaluationReadOnlyPage from '@/pages/common/EvaluationReadOnlyPage';
import SettingsPage from '@/pages/common/SettingsPage';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import UsersPage from '@/pages/admin/UsersPage';
import AccountRequestsPage from '@/pages/admin/AccountRequestsPage';
import OrganismesPage from '@/pages/admin/OrganismesPage';
import EvaluationsPage from '@/pages/admin/EvaluationsPage';
import PrincipesPage from '@/pages/admin/PrincipesPage';
import NotificationsPage from '@/pages/admin/NotificationsPage';
import ReclamationsPage from '@/pages/admin/ReclamationsPage';
import EmailJobsPage from '@/pages/admin/EmailJobsPage';

// Responsable pages
import ResponsableDashboard from '@/pages/responsable/ResponsableDashboard';
import EvaluationFillPage from '@/pages/responsable/EvaluationFillPage';

// Gouvernement pages
import GouvernementDashboard from '@/pages/gouvernement/GouvernementDashboard';
import EvaluationValidatePage from '@/pages/gouvernement/EvaluationValidatePage';
import RankingPage from '@/pages/gouvernement/RankingPage';

// Components
import ProtectedRoute from '@/components/common/ProtectedRoute';

function App() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { language, theme, direction } = useUIStore();

  useEffect(() => {
    changeLanguage(language);
  }, [language]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    root.dir = direction;
  }, [direction, theme]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/request-account" element={!isAuthenticated ? <AccountRequestPage /> : <Navigate to="/" />} />
      <Route path="/activate-account" element={!isAuthenticated ? <ActivateAccountPage /> : <Navigate to="/" />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Admin routes */}
          <Route element={<ProtectedRoute requiredRole={Role.ADMIN} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/account-requests" element={<AccountRequestsPage />} />
            <Route path="/admin/organismes" element={<OrganismesPage />} />
            <Route path="/admin/evaluations" element={<EvaluationsPage />} />
            <Route path="/admin/evaluations/:id/validate" element={<EvaluationValidatePage />} />
            <Route path="/admin/principes" element={<PrincipesPage />} />
            <Route path="/admin/notifications" element={<NotificationsPage />} />
            <Route path="/admin/reclamations" element={<ReclamationsPage />} />
            <Route path="/admin/email-jobs" element={<EmailJobsPage />} />
          </Route>

          <Route path="/evaluations/:id/view" element={<EvaluationReadOnlyPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Responsable routes */}
          <Route element={<ProtectedRoute requiredRole={Role.RESPONSABLE} />}>
            <Route path="/responsable/dashboard" element={<ResponsableDashboard />} />
            <Route path="/responsable/evaluation/:id" element={<EvaluationFillPage />} />
            <Route path="/responsable/principes" element={<PrincipesPage />} />
          </Route>

          {/* Gouvernement routes */}
          <Route element={<ProtectedRoute requiredRole={Role.GOUVERNEMENT} />}>
            <Route path="/gouvernement/dashboard" element={<GouvernementDashboard />} />
            <Route path="/gouvernement/evaluations" element={<EvaluationsPage />} />
            <Route path="/gouvernement/ranking" element={<RankingPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<RoleRedirect />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

function RoleRedirect() {
  const { user } = useAuthStore();
  
  if (!user) return <Navigate to="/login" />;
  
  switch (user.role) {
    case Role.SUPER_ADMIN:
    case Role.ADMIN:
      return <Navigate to="/admin/dashboard" replace />;
    case Role.RESPONSABLE:
      return <Navigate to="/responsable/dashboard" replace />;
    case Role.GOUVERNEMENT:
      return <Navigate to="/gouvernement/dashboard" replace />;
    default:
      return <Navigate to="/login" />;
  }
}

export default App;
