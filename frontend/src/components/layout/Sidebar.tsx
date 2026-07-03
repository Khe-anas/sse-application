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
  Shield,
  FileCheck2,
  ChevronLeft,
  MessageSquareWarning,
  Settings,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types';
import { useUIStore } from '@/stores/uiStore';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: Role[];
}

const navItems: NavItem[] = [
  { label: 'navigation.adminDashboard', icon: LayoutDashboard, path: '/admin/dashboard', roles: [Role.ADMIN] },
  { label: 'navigation.users', icon: Users, path: '/admin/users', roles: [Role.ADMIN] },
  { label: 'navigation.accountRequests', icon: FileCheck2, path: '/admin/account-requests', roles: [Role.ADMIN] },
  { label: 'navigation.organismes', icon: Building2, path: '/admin/organismes', roles: [Role.ADMIN] },
  { label: 'navigation.evaluations', icon: ClipboardList, path: '/admin/evaluations', roles: [Role.ADMIN] },
  { label: 'navigation.principes', icon: BookOpen, path: '/admin/principes', roles: [Role.ADMIN] },
  { label: 'navigation.reclamations', icon: MessageSquareWarning, path: '/admin/reclamations', roles: [Role.ADMIN] },
  { label: 'navigation.emailJobs', icon: Mail, path: '/admin/email-jobs', roles: [Role.ADMIN] },
  { label: 'navigation.notifications', icon: Bell, path: '/admin/notifications', roles: [Role.ADMIN] },
  
  { label: 'navigation.myEvaluations', icon: ClipboardList, path: '/responsable/dashboard', roles: [Role.RESPONSABLE] },
  { label: 'navigation.principes', icon: BookOpen, path: '/responsable/principes', roles: [Role.RESPONSABLE] },
  
  { label: 'navigation.governmentDashboard', icon: LayoutDashboard, path: '/gouvernement/dashboard', roles: [Role.ADMIN, Role.GOUVERNEMENT] },
  { label: 'navigation.evaluations', icon: ClipboardList, path: '/gouvernement/evaluations', roles: [Role.GOUVERNEMENT] },
  { label: 'navigation.ranking', icon: Trophy, path: '/gouvernement/ranking', roles: [Role.ADMIN, Role.GOUVERNEMENT] },
  { label: 'navigation.settings', icon: Settings, path: '/settings', roles: [Role.ADMIN, Role.RESPONSABLE, Role.GOUVERNEMENT] },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleSidebar } = useUIStore();

  const filteredItems = navItems.filter((item) =>
    user?.role && item.roles.includes(user.role)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary-400 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">{t('app.name')}</h1>
            <p className="text-gray-400 text-xs">{t('app.tagline')}</p>
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          className="lg:hidden text-gray-400 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={isActive ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{t(item.label)}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5">
          <div className="w-8 h-8 rounded-full bg-secondary-400 flex items-center justify-center text-white font-semibold text-sm">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.fullName}</p>
            <p className="text-gray-400 text-xs truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
