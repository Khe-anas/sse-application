import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { changeLanguage } from '@/i18n';
import { Role } from '@/types';

import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/common/ProtectedRoute';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const AccountRequestPage = lazy(() => import('@/pages/auth/AccountRequestPage'));
const ActivateAccountPage = lazy(() => import('@/pages/auth/ActivateAccountPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const EvaluationReadOnlyPage = lazy(() => import('@/pages/common/EvaluationReadOnlyPage'));
const SettingsPage = lazy(() => import('@/pages/common/SettingsPage'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const AccountRequestsPage = lazy(() => import('@/pages/admin/AccountRequestsPage'));
const OrganismesPage = lazy(() => import('@/pages/admin/OrganismesPage'));
const EvaluationsPage = lazy(() => import('@/pages/admin/EvaluationsPage'));
const PrincipesPage = lazy(() => import('@/pages/admin/PrincipesPage'));
const NotificationsPage = lazy(() => import('@/pages/admin/NotificationsPage'));
const AuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage'));
const ReclamationsPage = lazy(() => import('@/pages/admin/ReclamationsPage'));
const EmailJobsPage = lazy(() => import('@/pages/admin/EmailJobsPage'));
const ResponsableDashboard = lazy(() => import('@/pages/responsable/ResponsableDashboard'));
const EvaluationFillPage = lazy(() => import('@/pages/responsable/EvaluationFillPage'));
const EvaluateurDashboard = lazy(() => import('@/pages/evaluateur/EvaluateurDashboard'));
const EvaluationValidatePage = lazy(() => import('@/pages/gouvernement/EvaluationValidatePage'));
const GouvernementDashboard = lazy(() => import('@/pages/gouvernement/GouvernementDashboard'));
const RankingPage = lazy(() => import('@/pages/gouvernement/RankingPage'));

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700" />
    </div>
  );
}

function App() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { language, theme, direction, activeAccountId, loadThemeForAccount, loadLanguageForAccount } = useUIStore();
  const accountId = isAuthenticated && user ? user.id : null;

  useEffect(() => {
    if (activeAccountId !== accountId) return;
    changeLanguage(language);
  }, [accountId, activeAccountId, language]);

  useEffect(() => {
    loadThemeForAccount(accountId);
    loadLanguageForAccount(accountId);
  }, [accountId, loadLanguageForAccount, loadThemeForAccount]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    root.dir = direction;
  }, [direction, theme]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/request-account" element={!isAuthenticated ? <AccountRequestPage /> : <Navigate to="/" />} />
      <Route path="/activate-account" element={!isAuthenticated ? <ActivateAccountPage /> : <Navigate to="/" />} />
      <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPasswordPage /> : <Navigate to="/" />} />
      
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
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          </Route>

          <Route path="/evaluations/:id/view" element={<EvaluationReadOnlyPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* User routes */}
          <Route element={<ProtectedRoute requiredRole={Role.USER} />}>
            <Route path="/user/dashboard" element={<ResponsableDashboard />} />
            <Route path="/user/evaluation/:id" element={<EvaluationFillPage />} />
            <Route path="/user/principes" element={<PrincipesPage />} />
          </Route>

          {/* Evaluateure routes */}
          <Route element={<ProtectedRoute requiredRole={Role.EVALUATEUR} />}>
            <Route path="/evaluateur/dashboard" element={<EvaluateurDashboard />} />
            <Route path="/evaluateur/evaluations" element={<EvaluationsPage />} />
            <Route path="/evaluateur/evaluations/:id/validate" element={<EvaluationValidatePage />} />
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
    </Suspense>
  );
}

function RoleRedirect() {
  const { user } = useAuthStore();
  
  if (!user) return <Navigate to="/login" />;
  
  switch (user.role) {
    case Role.ADMIN:
      return <Navigate to="/admin/dashboard" replace />;
    case Role.USER:
      return <Navigate to="/user/dashboard" replace />;
    case Role.EVALUATEUR:
      return <Navigate to="/evaluateur/dashboard" replace />;
    case Role.GOUVERNEMENT:
      return <Navigate to="/gouvernement/dashboard" replace />;
    default:
      return <Navigate to="/login" />;
  }
}

export default App;
