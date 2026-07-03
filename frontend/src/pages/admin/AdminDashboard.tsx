import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
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
import { formatTodayLong } from '@/utils/date';

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadKPIs = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await dashboardService.getKPIs();
      setKpis(data);
    } catch (error) {
      console.error('Failed to load KPIs', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKPIs();
  }, [loadKPIs]);

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) {
        void loadKPIs(false);
      }
    };

    const interval = window.setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadKPIs]);

  const typeData = useMemo(() => (
    kpis?.organismesByType?.map((item) => ({
      ...item,
      name: t(`organisme.type.${item.key}`),
    })).filter((item) => item.count > 0) || []
  ), [kpis, t]);

  const statusData = useMemo(() => (
    kpis?.evaluationsByStatus?.map((item) => ({
      ...item,
      name: t(`evaluation.status.${item.key}`),
    })) || []
  ), [kpis, t]);

  const typeColors = ['#2563eb', '#16a34a', '#f59e0b'];
  const statusColors: Record<string, string> = {
    EN_COURS: '#f59e0b',
    SOUMISE: '#2563eb',
    EN_VALIDATION: '#7c3aed',
    VALIDEE: '#16a34a',
    REJETEE: '#dc2626',
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
          {formatTodayLong(i18n.resolvedLanguage || i18n.language)}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('charts.byType')}</h3>
          {typeData.length === 0 ? (
            <ChartEmpty label={t('common.noData')} />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={86}
                    paddingAngle={3}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={entry.key} fill={typeColors[index % typeColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('charts.byStatus')}</h3>
          {statusData.every((item) => item.count === 0) ? (
            <ChartEmpty label={t('common.noData')} />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry) => (
                      <Cell key={entry.key} fill={statusColors[entry.key] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-gray-400">
      {label}
    </div>
  );
}
