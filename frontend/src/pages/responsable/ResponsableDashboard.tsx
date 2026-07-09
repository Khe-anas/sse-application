import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, TrendingUp, Award, AlertCircle, Plus, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { evaluationService } from '@/services/evaluationService';
import { reportService } from '@/services/reportService';
import { useAuthStore } from '@/stores/authStore';
import { Role, StatusEvaluation } from '@/types';
import type { Evaluation } from '@/types';
import KPICard from '@/components/dashboard/KPICard';

export default function ResponsableDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const loadEvaluations = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    if (user.role === Role.USER && !user.organismeId) {
      setEvaluations([]);
      setIsLoading(false);
      return;
    }

    try {
      const params = user.role === Role.USER ? { organismeId: user.organismeId } : undefined;
      const data = await evaluationService.getAll(params);
      setEvaluations(data.content);
    } catch (error) { toast.error(t('responsable.loadError')); }
    finally { setIsLoading(false); }
  }, [user, t]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const enCours = evaluations.filter(e => e.status === 'EN_COURS').length;
  const soumises = evaluations.filter(e => e.status === 'SOUMISE').length;
  const validees = evaluations.filter(e => e.status === 'VALIDEE');
  const lastScore = validees.length > 0 ? validees[0].globalScore : null;

  const handleCreateEvaluation = async () => {
    if (!user?.organismeId) {
      toast.error(t('responsable.notLinked'));
      return;
    }

    setIsCreating(true);
    try {
      const evaluation = await evaluationService.create({
        organismeId: user.organismeId,
        year: new Date().getFullYear(),
      });
      toast.success(t('responsable.created'));
      navigate(`/user/evaluation/${evaluation.id}`);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || t('responsable.createError')
        : t('responsable.createError');
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadPdf = async (evaluationId: string) => {
    try {
      await reportService.downloadPdf(evaluationId);
    } catch (error) {
      toast.error(t('evaluationRead.downloadError'));
    }
  };

  const statusColors: Record<string, string> = {
    EN_COURS: 'bg-amber-100 text-amber-700',
    SOUMISE: 'bg-blue-100 text-blue-700',
    EN_VALIDATION: 'bg-purple-100 text-purple-700',
    VALIDEE: 'bg-green-100 text-green-700',
    REJETEE: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.role === Role.ADMIN ? t('responsable.adminEvaluationsTitle') : t('navigation.myEvaluations')}
        </h1>
        {user?.role === Role.USER && (
          <button
            onClick={handleCreateEvaluation}
            disabled={isCreating || !user.organismeId}
            className="btn-primary btn-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {isCreating ? t('responsable.creating') : t('responsable.new')}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={user?.role === Role.ADMIN ? t('responsable.kpiEvaluations') : t('responsable.kpiMyEvaluations')} value={evaluations.length} icon={ClipboardList} color="primary" />
        <KPICard title={t('responsable.kpiInProgress')} value={enCours} icon={AlertCircle} color="warning" />
        <KPICard title={t('responsable.kpiSubmitted')} value={soumises} icon={TrendingUp} color="info" />
        <KPICard title={t('responsable.kpiLastScore')} value={lastScore ? `${lastScore.toFixed(1)}%` : '-'} icon={Award} color="success" />
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{user?.role === Role.ADMIN ? t('responsable.listTitleAdmin') : t('responsable.listTitle')}</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? <div className="p-8 text-center text-gray-500">{t('common.loading')}</div> :
           evaluations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {user?.organismeId ? t('responsable.empty') : t('responsable.notLinkedMessage')}
            </div>
           ) :
           evaluations.map((ev) => (
            <div key={ev.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">{ev.organismeName}</p>
                <p className="text-sm text-gray-500">{t('common.year')} {ev.year}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`badge ${statusColors[ev.status]}`}>{t(`evaluation.status.${ev.status}`)}</span>
                {ev.status === 'EN_COURS' && (
                  <button onClick={() => navigate(`/user/evaluation/${ev.id}`)} className="btn-primary btn-sm">
                    {t('responsable.fill')}
                  </button>
                )}
                {ev.status === StatusEvaluation.VALIDEE && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => navigate(`/evaluations/${ev.id}/view`)} className="btn-outline btn-sm gap-2">
                      <Eye className="h-4 w-4" /> {t('common.details')}
                    </button>
                    <button onClick={() => handleDownloadPdf(ev.id)} className="btn-outline btn-sm gap-2">
                      <Download className="h-4 w-4" /> PDF
                    </button>
                  </div>
                )}
                {ev.globalScore != null && <span className="font-bold text-primary-700">{ev.globalScore.toFixed(1)}%</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
