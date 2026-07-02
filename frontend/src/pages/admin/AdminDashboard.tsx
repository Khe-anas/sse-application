import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Users,
  ClipboardList,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { dashboardService } from '@/services/dashboardService';
import type { DashboardKPIs } from '@/types';
import KPICard from '@/components/dashboard/KPICard';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      const data = await dashboardService.getKPIs();
      setKpis(data);
    } catch (error) {
      console.error('Failed to load KPIs', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('navigation.dashboard')}</h1>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString(document.documentElement.lang === 'ar' ? 'ar-TN' : document.documentElement.lang === 'en' ? 'en-US' : 'fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title={t('dashboard.totalOrganismes')}
          value={kpis?.totalOrganismes || 0}
          icon={Building2}
          color="primary"
        />
        <KPICard
          title={t('dashboard.totalUsers')}
          value={kpis?.totalUsers || 0}
          icon={Users}
          color="secondary"
        />
        <KPICard
          title={t('dashboard.evaluationsEnCours')}
          value={kpis?.evaluationsEnCours || 0}
          icon={ClipboardList}
          color="warning"
        />
        <KPICard
          title={t('dashboard.evaluationsSoumises')}
          value={kpis?.evaluationsSoumises || 0}
          icon={AlertCircle}
          color="info"
        />
        <KPICard
          title={t('dashboard.evaluationsValidees')}
          value={kpis?.evaluationsValidees || 0}
          icon={CheckCircle}
          color="success"
        />
        <KPICard
          title={t('dashboard.pendingValidations')}
          value={kpis?.pendingValidations || 0}
          icon={ClipboardList}
          color="danger"
        />
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('charts.byType')}</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            {t('charts.piePlaceholder')}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('charts.byStatus')}</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            {t('charts.barPlaceholder')}
          </div>
        </div>
      </div>
    </div>
  );
}
