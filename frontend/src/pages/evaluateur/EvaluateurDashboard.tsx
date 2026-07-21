import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, ClipboardCheck, Clock3, Eye, Lock, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import KPICard from '@/components/dashboard/KPICard';
import { evaluationService } from '@/services/evaluationService';
import { useAuthStore } from '@/stores/authStore';
import { StatusEvaluation, type Evaluation } from '@/types';
import { formatBackendShortDateTime } from '@/utils/date';

const REVIEW_STATUSES = new Set<StatusEvaluation>([
  StatusEvaluation.SOUMISE,
  StatusEvaluation.EN_VALIDATION,
]);

const statusColors: Record<StatusEvaluation, string> = {
  EN_COURS: 'bg-amber-100 text-amber-700',
  SOUMISE: 'bg-blue-100 text-blue-700',
  EN_VALIDATION: 'bg-purple-100 text-purple-700',
  VALIDEE: 'bg-green-100 text-green-700',
  REJETEE: 'bg-red-100 text-red-700',
};

export default function EvaluateurDashboard() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [claimingEvaluationId, setClaimingEvaluationId] = useState<string | null>(null);

  const loadQueue = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);

    try {
      const data = await evaluationService.getAll({ size: 200, _ts: Date.now() });
      setEvaluations(data.content);
    } catch (error) {
      toast.error(t('evaluatorDashboard.loadError'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) {
        void loadQueue(false);
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
  }, [loadQueue]);

  const reviewQueue = useMemo(
    () => evaluations.filter((evaluation) => REVIEW_STATUSES.has(evaluation.status)),
    [evaluations]
  );

  const lockedByMe = useMemo(
    () => reviewQueue.filter((evaluation) => evaluation.validationOpenedById === user?.id),
    [reviewQueue, user?.id]
  );

  const lockedByOthers = useMemo(
    () => reviewQueue.filter((evaluation) => isEvaluationLockedByOther(evaluation, user?.id)),
    [reviewQueue, user?.id]
  );

  const availableQueue = useMemo(
    () => reviewQueue.filter((evaluation) => !isEvaluationLockedByOther(evaluation, user?.id)),
    [reviewQueue, user?.id]
  );

  const orderedQueue = useMemo(() => (
    [...reviewQueue].sort((left, right) => {
      const leftScore = getQueuePriority(left, user?.id);
      const rightScore = getQueuePriority(right, user?.id);
      if (leftScore !== rightScore) return leftScore - rightScore;

      return getEvaluationTime(right) - getEvaluationTime(left);
    })
  ), [reviewQueue, user?.id]);

  const validatedCount = evaluations.filter((evaluation) => evaluation.status === StatusEvaluation.VALIDEE).length;

  const handleExamine = async (evaluation: Evaluation) => {
    if (isEvaluationLockedByOther(evaluation, user?.id)) {
      toast.error(t('evaluations.lockedBy', { name: evaluation.validationOpenedByName }));
      return;
    }

    setClaimingEvaluationId(evaluation.id);
    try {
      await evaluationService.claimValidation(evaluation.id);
      navigate(`/evaluateur/evaluations/${evaluation.id}/validate`);
    } catch (error) {
      toast.error(getErrorMessage(error, t('evaluations.claimError')));
      void loadQueue(false);
    } finally {
      setClaimingEvaluationId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('evaluatorDashboard.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('evaluatorDashboard.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => loadQueue(false)}
          className="btn-outline btn-sm gap-2"
          disabled={isRefreshing}
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title={t('evaluatorDashboard.kpiAvailable')} value={availableQueue.length} icon={ClipboardCheck} color="primary" to="/evaluateur/evaluations" />
        <KPICard title={t('evaluatorDashboard.kpiMine')} value={lockedByMe.length} icon={Clock3} color="warning" to="/evaluateur/evaluations" />
        <KPICard title={t('evaluatorDashboard.kpiLocked')} value={lockedByOthers.length} icon={Lock} color="danger" to="/evaluateur/evaluations" />
        <KPICard title={t('evaluatorDashboard.kpiValidated')} value={validatedCount} icon={CheckCircle} color="success" to="/evaluateur/evaluations" />
      </div>

      <div className="table-container">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{t('evaluatorDashboard.queueTitle')}</h2>
          <span className="text-sm text-gray-500">{t('evaluatorDashboard.queueCount', { count: reviewQueue.length })}</span>
        </div>
        <table className="table">
          <thead className="table-head">
            <tr>
              <th className="table-th">{t('common.organisme')}</th>
              <th className="table-th">{t('common.year')}</th>
              <th className="table-th">{t('common.status')}</th>
              <th className="table-th">{t('common.progress')}</th>
              <th className="table-th">{t('evaluatorDashboard.openedBy')}</th>
              <th className="table-th">{t('evaluatorDashboard.submittedAt')}</th>
              <th className="table-th">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr><td colSpan={7} className="table-td py-8 text-center">{t('common.loading')}</td></tr>
            ) : orderedQueue.length === 0 ? (
              <tr><td colSpan={7} className="table-td py-8 text-center text-gray-500">{t('evaluatorDashboard.empty')}</td></tr>
            ) : orderedQueue.map((evaluation) => {
              const lockedByOther = isEvaluationLockedByOther(evaluation, user?.id);
              const openedByMe = evaluation.validationOpenedById === user?.id;

              return (
                <tr key={evaluation.id} className={openedByMe ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-gray-50'}>
                  <td className="table-td font-medium">{evaluation.organismeName}</td>
                  <td className="table-td">{evaluation.year}</td>
                  <td className="table-td">
                    <span className={`badge ${statusColors[evaluation.status]}`}>
                      {t(`evaluation.status.${evaluation.status}`)}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-gray-200">
                        <div className="h-full rounded-full bg-primary-600" style={{ width: `${evaluation.progressPercentage || 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{evaluation.progressPercentage || 0}%</span>
                    </div>
                  </td>
                  <td className="table-td">
                    {openedByMe ? t('evaluatorDashboard.you') : evaluation.validationOpenedByName || '-'}
                  </td>
                  <td className="table-td text-gray-500">
                    {formatBackendShortDateTime(evaluation.submittedAt, language)}
                  </td>
                  <td className="table-td">
                    <button
                      type="button"
                      onClick={() => handleExamine(evaluation)}
                      disabled={lockedByOther || claimingEvaluationId === evaluation.id}
                      className="btn-outline btn-sm gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                      title={lockedByOther ? t('evaluations.lockedBy', { name: evaluation.validationOpenedByName }) : undefined}
                    >
                      {lockedByOther ? <Lock className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {lockedByOther ? t('evaluations.locked') : t('evaluations.examine')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isEvaluationLockedByOther(evaluation: Evaluation, userId?: string) {
  return REVIEW_STATUSES.has(evaluation.status)
    && Boolean(evaluation.validationOpenedById && evaluation.validationOpenedById !== userId);
}

function getQueuePriority(evaluation: Evaluation, userId?: string) {
  if (evaluation.validationOpenedById === userId) return 0;
  if (!evaluation.validationOpenedById) return 1;
  return 2;
}

function getEvaluationTime(evaluation: Evaluation) {
  const timestamp = Date.parse(evaluation.submittedAt || evaluation.startedAt || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || fallback;
  }
  return fallback;
}
