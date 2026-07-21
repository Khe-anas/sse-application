import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Award, Building2, CheckCircle, ClipboardList, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { dashboardService } from '@/services/dashboardService';
import type { DashboardKPIs, RankingItem } from '@/types';
import KPICard from '@/components/dashboard/KPICard';

export default function GouvernementDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  const loadData = useCallback(async () => {
    try {
      const [kpiData, rankingData] = await Promise.all([
        dashboardService.getKPIs(),
        dashboardService.getRanking(currentYear),
      ]);
      setKpis(kpiData);
      setRanking(rankingData);
    } catch (error) {
      toast.error(t('gouvernement.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getMaturityColor = (level: string) => {
    if (level === 'EXCELLENT') return 'bg-green-100 text-green-700';
    if (level === 'AVANCE') return 'bg-blue-100 text-blue-700';
    if (level === 'EN_PROGRESSION') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('navigation.governmentDashboard')}</h1>
          <p className="text-sm text-gray-500">{t('gouvernement.dashboardSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500">{t('gouvernement.year', { year: currentYear })}</span>
          <button onClick={() => navigate('/gouvernement/evaluations')} className="btn-outline btn-sm gap-2">
            <ClipboardList className="h-4 w-4" /> {t('navigation.evaluations')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={t('gouvernement.kpiCompanies')} value={kpis?.totalOrganismes || 0} icon={Building2} color="primary" to="/gouvernement/evaluations" />
        <KPICard title={t('dashboard.evaluationsValidees')} value={kpis?.evaluationsValidees || 0} icon={CheckCircle} color="success" to="/gouvernement/ranking" />
        <KPICard title={t('dashboard.evaluationsEnCours')} value={kpis?.evaluationsEnCours || 0} icon={ClipboardList} color="warning" to="/gouvernement/evaluations" />
        <KPICard title={t('dashboard.averageScore')} value={kpis?.averageScore ? `${kpis.averageScore.toFixed(1)}%` : '-'} icon={Award} color="secondary" to="/gouvernement/ranking" />
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-secondary-500" />
            <h2 className="text-lg font-semibold">{t('gouvernement.rankingTitle')}</h2>
          </div>
          <button onClick={() => navigate('/gouvernement/ranking')} className="btn-outline btn-sm">
            {t('gouvernement.seeRanking')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-th">{t('common.rank')}</th>
                <th className="table-th">{t('common.organisme')}</th>
                <th className="table-th">{t('common.type')}</th>
                <th className="table-th">{t('common.score')}</th>
                <th className="table-th">{t('common.maturity')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ranking.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-td text-center py-8 text-gray-500">{t('gouvernement.noRankingData')}</td>
                </tr>
              ) : (
                ranking.slice(0, 5).map((item) => (
                  <tr key={item.organismeId} className="hover:bg-gray-50">
                    <td className="table-td font-bold text-primary-700">#{item.rank}</td>
                    <td className="table-td font-medium">{item.organismeName}</td>
                    <td className="table-td">
                      <span className="badge bg-gray-100 text-gray-600">{t(`organisme.type.${item.type}`)}</span>
                    </td>
                    <td className="table-td font-bold text-primary-700">{item.score.toFixed(1)}%</td>
                    <td className="table-td">
                      <span className={`badge ${getMaturityColor(item.maturityLevel)}`}>
                        {t(`evaluation.maturity.${item.maturityLevel}`)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
