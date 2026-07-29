import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  Bell,
  BookOpen,
  Trophy,
  FileCheck2,
  ChevronLeft,
  MessageSquareWarning,
  Settings,
  History,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types';
import { useUIStore } from '@/stores/uiStore';
import BrandLogo from '@/components/branding/BrandLogo';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: Role[];
  permission?: string;
  systemAdminOnly?: boolean;
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'navigationGroups.overview',
    items: [
      { label: 'navigation.adminDashboard', icon: LayoutDashboard, path: '/admin/dashboard', roles: [Role.ADMIN], permission: 'DASHBOARD_READ' },
      { label: 'navigation.myEvaluations', icon: LayoutDashboard, path: '/user/dashboard', roles: [Role.USER] },
      { label: 'navigation.evaluations', icon: ClipboardList, path: '/evaluateur/dashboard', roles: [Role.EVALUATEUR] },
      { label: 'navigation.governmentDashboard', icon: LayoutDashboard, path: '/gouvernement/dashboard', roles: [Role.GOUVERNEMENT] },
    ],
  },
  {
    label: 'navigationGroups.work',
    items: [
      { label: 'navigation.principes', icon: BookOpen, path: '/user/principes', roles: [Role.USER] },
      { label: 'navigation.ranking', icon: Trophy, path: '/gouvernement/ranking', roles: [Role.GOUVERNEMENT] },
    ],
  },
  {
    label: 'navigationGroups.administration',
    items: [
      { label: 'navigation.users', icon: Users, path: '/admin/users', roles: [Role.ADMIN], permission: 'USERS_READ' },
      { label: 'navigation.accountRequests', icon: FileCheck2, path: '/admin/account-requests', roles: [Role.ADMIN], permission: 'ACCOUNT_REQUESTS_READ' },
      { label: 'navigation.organismes', icon: Building2, path: '/admin/organismes', roles: [Role.ADMIN], permission: 'ORGANISMES_READ' },
      { label: 'navigation.evaluations', icon: ClipboardList, path: '/admin/evaluations', roles: [Role.ADMIN], permission: 'EVALUATIONS_READ' },
      { label: 'navigation.principes', icon: BookOpen, path: '/admin/principes', roles: [Role.ADMIN], permission: 'REFERENTIEL_READ' },
      { label: 'navigation.reclamations', icon: MessageSquareWarning, path: '/admin/reclamations', roles: [Role.ADMIN], permission: 'RECLAMATIONS_READ' },
    ],
  },
  {
    label: 'navigationGroups.system',
    items: [
      { label: 'navigation.catalogues', icon: SlidersHorizontal, path: '/admin/catalogues', roles: [Role.ADMIN], systemAdminOnly: true },
      { label: 'navigation.accessControl', icon: ShieldCheck, path: '/admin/access-control', roles: [Role.ADMIN], systemAdminOnly: true },
      { label: 'navigation.notifications', icon: Bell, path: '/admin/notifications', roles: [Role.ADMIN], permission: 'NOTIFICATIONS_NOTIFY' },
      { label: 'navigation.auditLogs', icon: History, path: '/admin/audit-logs', roles: [Role.ADMIN], permission: 'AUDIT_READ' },
      { label: 'navigation.settings', icon: Settings, path: '/settings', roles: [Role.ADMIN, Role.USER, Role.EVALUATEUR, Role.GOUVERNEMENT] },
    ],
  },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleSidebar } = useUIStore();
  const legacyAdminSession = user?.role === Role.ADMIN
    && user.systemAdmin == null
    && user.permissions == null;
  const hasSystemAccess = Boolean(user?.systemAdmin || legacyAdminSession);

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!user?.role || !item.roles.includes(user.role)) return false;
        if (item.systemAdminOnly && !hasSystemAccess) return false;
        if (item.permission && !hasSystemAccess && !user.permissions?.includes(item.permission)) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);

  const handleNavigate = (path: string) => {
    navigate(path);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      toggleSidebar();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-11 w-11 flex-shrink-0 rounded-lg border border-white/20 shadow-sm" />
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">{t('app.name')}</h1>
            <p className="mt-0.5 max-w-[150px] truncate text-xs text-blue-100/60">{t('app.tagline')}</p>
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="icon-button h-9 w-9 border-white/10 bg-white/5 text-blue-100 shadow-none hover:bg-white/10 hover:text-white lg:hidden"
          aria-label={t('common.close')}
        >
          <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
        </button>
      </div>

      <div className="px-5 pt-4">
        <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-blue-50">
          {user?.roleLabel || (user?.role ? t(`user.role.${user.role}`) : '')}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {filteredGroups.map((group) => (
          <section key={group.label} aria-labelledby={`nav-${group.label}`}>
            <h2 id={`nav-${group.label}`} className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100/45">
              {t(group.label)}
            </h2>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={isActive ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="h-[18px] w-[18px] flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{t(item.label)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.07] px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-400 text-sm font-bold text-primary-950">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
            <p className="truncate text-xs text-blue-100/55">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
