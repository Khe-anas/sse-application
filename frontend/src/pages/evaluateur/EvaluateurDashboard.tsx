import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, CheckCircle2, ClipboardCheck, Lock, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { evaluationService } from '@/services/evaluationService';
import { useAuthStore } from '@/stores/authStore';
import { StatusEvaluation, type Evaluation } from '@/types';
import { formatBackendShortDateTime } from '@/utils/date';
import PageHeader from '@/components/ui/PageHeader';

const REVIEW_STATUSES = new Set<StatusEvaluation>([
  StatusEvaluation.SOUMISE,
  StatusEvaluation.EN_VALIDATION,
]);

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
    <div className="page-shell space-y-5">
      <PageHeader
        eyebrow={t('navigationGroups.work')}
        title={t('evaluatorDashboard.title')}
        description={t('evaluatorDashboard.subtitle')}
        icon={ClipboardCheck}
        actions={<button
          type="button"
          onClick={() => loadQueue(false)}
          className="btn-outline gap-2"
          disabled={isRefreshing}
        >
          <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </button>}
      />

      <section className="overflow-hidden rounded-xl bg-primary-950 px-5 py-5 text-white shadow-sm sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary-200">{t('evaluatorDashboard.pendingLabel')}</p>
            <p className="mt-1 text-4xl font-bold tabular-nums">{reviewQueue.length}</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-primary-100">
              {t('evaluatorDashboard.simpleInstruction')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-lg bg-white/10 px-3 py-2">
              {t('evaluatorDashboard.kpiAvailable')}: {availableQueue.length}
            </span>
            {lockedByMe.length > 0 && (
              <span className="rounded-lg bg-amber-400/20 px-3 py-2 text-amber-100">
                {t('evaluatorDashboard.kpiMine')}: {lockedByMe.length}
              </span>
            )}
            {lockedByOthers.length > 0 && (
              <span className="rounded-lg bg-white/10 px-3 py-2">
                {t('evaluatorDashboard.kpiLocked')}: {lockedByOthers.length}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#132129]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 className="section-heading">{t('evaluatorDashboard.queueTitle')}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {t('evaluatorDashboard.queueCount', { count: reviewQueue.length })}
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
            {t('evaluatorDashboard.kpiValidated')}: {validatedCount}
          </span>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-700">
          {isLoading ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-gray-500">
              <RefreshCcw className="me-2 h-4 w-4 animate-spin" />
              {t('common.loading')}
            </div>
          ) : orderedQueue.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-slate-100">
                {t('evaluatorDashboard.empty')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                {t('evaluatorDashboard.emptyDetail')}
              </p>
            </div>
          ) : orderedQueue.map((evaluation) => {
              const lockedByOther = isEvaluationLockedByOther(evaluation, user?.id);
              const openedByMe = evaluation.validationOpenedById === user?.id;

              return (
                <article
                  key={evaluation.id}
                  className={`flex flex-col gap-4 px-5 py-5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                    openedByMe
                      ? 'bg-amber-50/60 dark:bg-amber-900/10'
                      : 'hover:bg-gray-50/80 dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                        {evaluation.organismeName}
                      </h3>
                      <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                        {evaluation.year}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      {lockedByOther ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-red-700 dark:text-red-300">
                          <Lock className="h-4 w-4" />
                          {t('evaluatorDashboard.lockedByName', {
                            name: evaluation.validationOpenedByName || '-',
                          })}
                        </span>
                      ) : (
                        <span className={`font-medium ${
                          openedByMe
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-green-700 dark:text-green-300'
                        }`}
                        >
                          {openedByMe
                            ? t('evaluatorDashboard.inProgressByYou')
                            : t('evaluatorDashboard.readyToStart')}
                        </span>
                      )}
                      <span className="text-gray-500 dark:text-slate-400">
                        {t('evaluatorDashboard.submittedAt')}: {formatBackendShortDateTime(
                          evaluation.submittedAt,
                          language,
                        )}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExamine(evaluation)}
                    disabled={lockedByOther || claimingEvaluationId === evaluation.id}
                    className={`min-h-11 w-full justify-center gap-2 sm:w-auto ${
                      openedByMe ? 'btn-primary' : 'btn-success'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                    title={lockedByOther
                      ? t('evaluations.lockedBy', { name: evaluation.validationOpenedByName })
                      : undefined}
                  >
                    {lockedByOther ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                    )}
                    {lockedByOther
                      ? t('evaluations.locked')
                      : openedByMe
                        ? t('evaluatorDashboard.continue')
                        : t('evaluatorDashboard.start')}
                  </button>
                </article>
              );
            })}
        </div>
      </section>
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
