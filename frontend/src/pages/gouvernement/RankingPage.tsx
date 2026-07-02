import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { dashboardService } from '@/services/dashboardService';
import type { RankingItem, TypeOrganisme } from '@/types';
import KPICard from '@/components/dashboard/KPICard';

export default function RankingPage() {
  const { t } = useTranslation();
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [type, setType] = useState<TypeOrganisme | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const loadRanking = useCallback(async () => {
    try {
      const data = await dashboardService.getRanking(year, type);
      setRanking(data);
    } catch (error) { toast.error(t('ranking.loadError')); }
    finally { setIsLoading(false); }
  }, [year, type, t]);

  useEffect(() => { loadRanking(); }, [loadRanking]);

  const getTrendIcon = (trend: string) => {
    if (trend === 'UP') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'DOWN') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getMaturityColor = (level: string) => {
    if (level === 'EXCELLENT') return 'bg-green-100 text-green-700';
    if (level === 'AVANCE') return 'bg-blue-100 text-blue-700';
    if (level === 'EN_PROGRESSION') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('navigation.ranking')}</h1>

      <KPICard title={t('ranking.kpiClassified')} value={ranking.length} icon={Trophy} color="secondary" />

      <div className="card p-4 flex items-center gap-4">
        <div>
          <label className="label">{t('common.year')}</label>
          <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="input w-32" />
        </div>
        <div>
          <label className="label">{t('common.type')}</label>
          <select value={type || ''} onChange={(e) => setType(e.target.value as TypeOrganisme || undefined)} className="select w-40">
            <option value="">{t('ranking.typeAll')}</option>
            <option value="PUBLIC">{t('organisme.type.PUBLIC')}</option>
            <option value="PRIVE">{t('organisme.type.PRIVE')}</option>
            <option value="SOCIETE_CIVILE">{t('organisme.type.SOCIETE_CIVILE')}</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead className="table-head">
            <tr>
              <th className="table-th">{t('common.rank')}</th>
              <th className="table-th">{t('common.organisme')}</th>
              <th className="table-th">{t('common.type')}</th>
              <th className="table-th">{t('common.score')}</th>
              <th className="table-th">{t('common.maturity')}</th>
              <th className="table-th">{t('common.trend')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? <tr><td colSpan={6} className="table-td text-center py-8">{t('common.loading')}</td></tr> :
             ranking.length === 0 ? <tr><td colSpan={6} className="table-td text-center py-8">{t('ranking.empty')}</td></tr> :
             ranking.map((item) => (
              <tr key={item.rank} className="hover:bg-gray-50">
                <td className="table-td">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    item.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                    item.rank === 2 ? 'bg-gray-100 text-gray-600' :
                    item.rank === 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    {item.rank}
                  </span>
                </td>
                <td className="table-td font-medium">{item.organismeName}</td>
                <td className="table-td"><span className="badge bg-gray-100 text-gray-600">{t(`organisme.type.${item.type}`)}</span></td>
                <td className="table-td font-bold text-primary-700">{item.score.toFixed(1)}%</td>
                <td className="table-td"><span className={`badge ${getMaturityColor(item.maturityLevel)}`}>{t(`evaluation.maturity.${item.maturityLevel}`)}</span></td>
                <td className="table-td">{getTrendIcon(item.trend)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
