import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import axios from 'axios';
import {
  AlertTriangle,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Download,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Loader2,
  RotateCcw,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { evaluationService, reponseService } from '@/services/evaluationService';
import { fileService } from '@/services/fileService';
import { reportService } from '@/services/reportService';
import {
  Role,
  Niveau,
  StatusEvaluation,
  StatusReponse,
  type BonnePratique,
  type Critere,
  type Evaluation,
  type Principe,
  type Reponse,
} from '@/types';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import { getLocalizedField } from '@/utils/localization';
import { getNiveauTranslationKey } from '@/utils/niveau';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type ReviewFilter = 'ALL' | 'PENDING' | StatusReponse.VALIDEE | StatusReponse.A_CORRIGER | StatusReponse.REJETEE;

interface CriterionRow {
  bonnePratique: BonnePratique;
  critere: Critere;
  reponse?: Reponse;
}

export default function EvaluationValidatePage() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === Role.ADMIN;
  const basePath = isAdmin ? '/admin/evaluations' : '/evaluateur/evaluations';
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [principes, setPrincipes] = useState<Principe[]>([]);
  const [reponses, setReponses] = useState<Record<string, Reponse[]>>({});
  const [activePrincipe, setActivePrincipe] = useState<string>('');
  const [activeBonnePratiqueId, setActiveBonnePratiqueId] = useState<string>('');
  const [activeCriterionId, setActiveCriterionId] = useState<string>('');
  const [filter, setFilter] = useState<ReviewFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busyResponseId, setBusyResponseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalCorrectionOpen, setGlobalCorrectionOpen] = useState(false);
  const [globalCorrectionReason, setGlobalCorrectionReason] = useState('');
  const [isReturningEvaluation, setIsReturningEvaluation] = useState(false);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [isValidatingEvaluation, setIsValidatingEvaluation] = useState(false);
  const pendingScrollPositionRef = useRef<{ left: number; top: number } | null>(null);

  const updateNavigationKeepingPosition = useCallback((update: () => void) => {
    pendingScrollPositionRef.current = { left: window.scrollX, top: window.scrollY };
    update();
  }, []);

  useLayoutEffect(() => {
    const position = pendingScrollPositionRef.current;
    if (!position) return;

    const restorePosition = () => window.scrollTo({ ...position, behavior: 'auto' });
    restorePosition();
    let finalFrame = 0;
    const renderFrame = window.requestAnimationFrame(() => {
      restorePosition();
      finalFrame = window.requestAnimationFrame(() => {
        restorePosition();
        pendingScrollPositionRef.current = null;
      });
    });

    return () => {
      window.cancelAnimationFrame(renderFrame);
      window.cancelAnimationFrame(finalFrame);
    };
  }, [activeBonnePratiqueId, activeCriterionId, activePrincipe]);

  const hasEvaluatorDecision = (reponse: Reponse) =>
    reponse.status === StatusReponse.VALIDEE
    || reponse.status === StatusReponse.REJETEE
    || reponse.status === StatusReponse.A_CORRIGER;

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [evalData, princData] = await Promise.all([
        evaluationService.claimValidation(id),
        api.get<Principe[]>('/principes').then((response) => response.data),
      ]);

      const repMap: Record<string, Reponse[]> = {};
      for (const principe of princData) {
        repMap[principe.id] = await reponseService.getByEvaluation(id, principe.id);
      }

      const initialNotes: Record<string, string> = {};
      Object.values(repMap).flat().forEach((reponse) => {
        initialNotes[reponse.id] = reponse.rejectionReason || reponse.validatorComment || '';
      });

      const firstPendingPrincipe = princData.find((principe) =>
        (repMap[principe.id] || []).some((reponse) => !hasEvaluatorDecision(reponse))
      );

      setEvaluation(evalData);
      setPrincipes(princData);
      setReponses(repMap);
      setReviewNotes(initialNotes);
      setActivePrincipe((current) =>
        current && princData.some((principe) => principe.id === current)
          ? current
          : firstPendingPrincipe?.id || princData[0]?.id || ''
      );
    } catch (error) {
      toast.error(getErrorMessage(error, t('validation.loadError')));
      navigate(basePath);
    } finally {
      setIsLoading(false);
    }
  }, [basePath, id, navigate, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!id) return undefined;

    const keepLockAlive = () => {
      if (!document.hidden) {
        void evaluationService.claimValidation(id).catch(() => undefined);
      }
    };

    const interval = window.setInterval(keepLockAlive, 60000);
    return () => {
      window.clearInterval(interval);
      void evaluationService.releaseValidation(id).catch(() => undefined);
    };
  }, [id]);

  const updateReponseInState = (updatedReponse: Reponse) => {
    setReponses((current) => ({
      ...current,
      [updatedReponse.principeId]: (current[updatedReponse.principeId] || []).map((reponse) =>
        reponse.id === updatedReponse.id ? updatedReponse : reponse
      ),
    }));
    setReviewNotes((current) => ({
      ...current,
      [updatedReponse.id]: updatedReponse.rejectionReason || updatedReponse.validatorComment || '',
    }));
  };

  const handleReviewAction = async (reponse: Reponse, action: StatusReponse, reason?: string) => {
    const note = (reason ?? reviewNotes[reponse.id] ?? '').trim();
    const needsReason = action === StatusReponse.REJETEE || action === StatusReponse.A_CORRIGER;
    if (needsReason && !note) {
      toast.error(t('validation.reasonRequired'));
      return;
    }

    const actionConfig = {
      [StatusReponse.VALIDEE]: {
        endpoint: 'validate',
        payload: { comment: note },
        successMessage: t('validation.responseValidated'),
      },
      [StatusReponse.REJETEE]: {
        endpoint: 'reject',
        payload: { reason: note },
        successMessage: t('validation.responseRejected'),
      },
      [StatusReponse.A_CORRIGER]: {
        endpoint: 'request-correction',
        payload: { reason: note },
        successMessage: t('validation.correctionMarked'),
      },
    } as const;

    const config = actionConfig[action as keyof typeof actionConfig];
    if (!config) return;

    setBusyResponseId(reponse.id);
    try {
      const response = await api.put<Reponse>(`/reponses/${reponse.id}/${config.endpoint}`, config.payload);
      updateReponseInState(response.data);
      toast.success(config.successMessage);
    } catch (error) {
      toast.error(getErrorMessage(error, t('validation.error')));
    } finally {
      setBusyResponseId(null);
    }
  };

  const handleDownloadFile = async (fileUrl: string) => {
    try {
      await fileService.download(fileUrl);
    } catch {
      toast.error(t('validation.downloadError'));
    }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      await reportService.downloadPdf(id);
    } catch {
      toast.error(t('evaluationRead.downloadError'));
    }
  };

  const getPrincipeProgress = (principe: Principe) => {
    const principeReponses = reponses[principe.id] || [];
    const total = principe.bonnesPratiques.reduce((count, bonnePratique) => count + bonnePratique.criteres.length, 0);
    const reviewed = principeReponses.filter(hasEvaluatorDecision).length;
    const hasCorrection = principeReponses.some((reponse) => reponse.status === StatusReponse.A_CORRIGER);
    return { reviewed, total, hasCorrection };
  };

  const allReponses = useMemo(() => Object.values(reponses).flat(), [reponses]);
  const pendingDecisionReponses = allReponses.filter((reponse) => !hasEvaluatorDecision(reponse));
  const hasRequestedCorrections = allReponses.some((reponse) => reponse.status === StatusReponse.A_CORRIGER);
  const reviewedCount = allReponses.length - pendingDecisionReponses.length;
  const reviewPercentage = allReponses.length > 0 ? Math.round((reviewedCount / allReponses.length) * 100) : 0;
  const canValidateEvaluation =
    pendingDecisionReponses.length === 0
    && !hasRequestedCorrections
    && allReponses.length > 0
    && (evaluation?.status === StatusEvaluation.SOUMISE || evaluation?.status === StatusEvaluation.EN_VALIDATION);

  const handleValidateEvaluation = async () => {
    if (!id) return;
    if (pendingDecisionReponses.length > 0) {
      toast.error(t('validation.pendingActionsBlock', { count: pendingDecisionReponses.length }));
      setActivePrincipe(pendingDecisionReponses[0].principeId);
      setActiveBonnePratiqueId('');
      setActiveCriterionId('');
      setFilter('PENDING');
      return;
    }
    if (!canValidateEvaluation) {
      toast.error(t('validation.evaluationNotReady'));
      return;
    }
    setValidateDialogOpen(true);
  };

  const confirmValidateEvaluation = async () => {
    if (!id) return;
    setIsValidatingEvaluation(true);
    try {
      await evaluationService.validate(id);
      toast.success(t('validation.evaluationValidated'));
      setValidateDialogOpen(false);
      navigate(basePath);
    } catch (error) {
      toast.error(getErrorMessage(error, t('validation.evaluationValidatedError')));
    } finally {
      setIsValidatingEvaluation(false);
    }
  };

  const handleReturnEvaluation = async () => {
    if (!id || !globalCorrectionReason.trim()) {
      toast.error(t('validation.reasonRequired'));
      return;
    }

    setIsReturningEvaluation(true);
    try {
      await evaluationService.requestCorrection(id, globalCorrectionReason.trim());
      toast.success(t('validation.correctionRequested'));
      navigate(basePath);
    } catch (error) {
      toast.error(getErrorMessage(error, t('validation.error')));
    } finally {
      setIsReturningEvaluation(false);
    }
  };

  const activePrincipeData = principes.find((principe) => principe.id === activePrincipe);
  const activeRows = useMemo<CriterionRow[]>(() => {
    if (!activePrincipeData) return [];
    const principeReponses = reponses[activePrincipeData.id] || [];
    return activePrincipeData.bonnesPratiques.flatMap((bonnePratique) =>
      bonnePratique.criteres.map((critere) => ({
        bonnePratique,
        critere,
        reponse: principeReponses.find((item) => item.critereId === critere.id),
      }))
    );
  }, [activePrincipeData, reponses]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase(language);
    return activeRows.filter((row) => {
      const matchesFilter = filter === 'ALL'
        || (filter === 'PENDING' && (!row.reponse || !hasEvaluatorDecision(row.reponse)))
        || row.reponse?.status === filter;
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;

      const searchableText = [
        getLocalizedField(row.bonnePratique, 'label', language),
        getLocalizedField(row.critere, 'label', language),
        row.reponse?.commentaire,
      ].filter(Boolean).join(' ').toLocaleLowerCase(language);
      return searchableText.includes(normalizedQuery);
    });
  }, [activeRows, filter, language, searchQuery]);

  const filterCounts = {
    ALL: activeRows.length,
    PENDING: activeRows.filter((row) => !row.reponse || !hasEvaluatorDecision(row.reponse)).length,
    [StatusReponse.VALIDEE]: activeRows.filter((row) => row.reponse?.status === StatusReponse.VALIDEE).length,
    [StatusReponse.A_CORRIGER]: activeRows.filter((row) => row.reponse?.status === StatusReponse.A_CORRIGER).length,
    [StatusReponse.REJETEE]: activeRows.filter((row) => row.reponse?.status === StatusReponse.REJETEE).length,
  };

  const filteredGoodPractices = useMemo(
    () => activePrincipeData?.bonnesPratiques.filter((bonnePratique) =>
      filteredRows.some((row) => row.bonnePratique.id === bonnePratique.id)
    ) || [],
    [activePrincipeData, filteredRows]
  );

  useEffect(() => {
    if (filteredRows.length === 0) {
      setActiveBonnePratiqueId('');
      setActiveCriterionId('');
      return;
    }

    const currentRow = filteredRows.find((row) => row.critere.id === activeCriterionId);
    if (currentRow) {
      if (activeBonnePratiqueId !== currentRow.bonnePratique.id) {
        setActiveBonnePratiqueId(currentRow.bonnePratique.id);
      }
      return;
    }

    const nextRow = filteredRows.find((row) => row.bonnePratique.id === activeBonnePratiqueId) || filteredRows[0];
    setActiveBonnePratiqueId(nextRow.bonnePratique.id);
    setActiveCriterionId(nextRow.critere.id);
  }, [activeBonnePratiqueId, activeCriterionId, filteredRows]);

  const visibleCriterionRows = filteredRows.filter(
    (row) => row.bonnePratique.id === activeBonnePratiqueId
  );
  const activeGoodPracticeIndex = filteredGoodPractices.findIndex(
    (bonnePratique) => bonnePratique.id === activeBonnePratiqueId
  );
  const activeReviewIndex = visibleCriterionRows.findIndex((row) => row.critere.id === activeCriterionId);
  const activeReviewRow = activeReviewIndex >= 0 ? visibleCriterionRows[activeReviewIndex] : undefined;
  const moveToCriterion = (offset: number) => {
    const nextRow = visibleCriterionRows[activeReviewIndex + offset];
    if (!nextRow) return;
    updateNavigationKeepingPosition(() => setActiveCriterionId(nextRow.critere.id));
  };

  const selectGoodPractice = (bonnePratiqueId: string) => {
    const firstRow = filteredRows.find((row) => row.bonnePratique.id === bonnePratiqueId);
    if (!firstRow) return;
    updateNavigationKeepingPosition(() => {
      setActiveBonnePratiqueId(bonnePratiqueId);
      setActiveCriterionId(firstRow.critere.id);
    });
  };

  const moveToGoodPractice = (offset: number) => {
    const nextGoodPractice = filteredGoodPractices[activeGoodPracticeIndex + offset];
    if (nextGoodPractice) selectGoodPractice(nextGoodPractice.id);
  };

  const selectPrinciple = (principe: Principe) => {
    const firstGoodPractice = principe.bonnesPratiques.find((bonnePratique) => bonnePratique.criteres.length > 0);
    updateNavigationKeepingPosition(() => {
      setActivePrincipe(principe.id);
      setActiveBonnePratiqueId(firstGoodPractice?.id || '');
      setActiveCriterionId(firstGoodPractice?.criteres[0]?.id || '');
      setFilter('ALL');
      setSearchQuery('');
    });
  };

  const activePrincipeIndex = principes.findIndex((principe) => principe.id === activePrincipe);
  const moveToPrincipe = (offset: number) => {
    const nextPrincipe = principes[activePrincipeIndex + offset];
    if (!nextPrincipe) return;
    selectPrinciple(nextPrincipe);
  };

  if (isLoading || !evaluation) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-700" />
      </div>
    );
  }

  const filters: { value: ReviewFilter; label: string }[] = [
    { value: 'ALL', label: t('validation.filterAll') },
    { value: 'PENDING', label: t('validation.filterPending') },
    { value: StatusReponse.VALIDEE, label: t('validation.filterValidated') },
    { value: StatusReponse.A_CORRIGER, label: t('validation.filterCorrection') },
    { value: StatusReponse.REJETEE, label: t('validation.filterRejected') },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-5" style={{ overflowAnchor: 'none' }}>
      <header className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(basePath)}
            className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
            title={t('common.back')}
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary-700">{t('validation.reviewWorkspace')}</p>
            <h1 className="truncate text-2xl font-bold text-gray-900">
              {evaluation.organismeName}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t('validation.year', { year: evaluation.year })}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleDownloadPdf} className="btn-outline btn-sm gap-2">
            <Download className="h-4 w-4" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => setGlobalCorrectionOpen(true)}
            className="btn-danger btn-sm gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t('validation.reject')}
          </button>
          <button
            type="button"
            onClick={handleValidateEvaluation}
            disabled={!canValidateEvaluation}
            className="btn-success btn-sm gap-2 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Check className="h-4 w-4" />
            {t('validation.validateEvaluation')}
          </button>
        </div>
      </header>

      <section className="grid overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm sm:grid-cols-3">
        <div className="border-b border-gray-200 p-4 sm:border-b-0 sm:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-50 text-primary-700">
              <CircleDot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">{t('validation.reviewProgress')}</p>
              <p className="text-lg font-semibold text-gray-900">{reviewedCount} / {allReponses.length}</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${reviewPercentage}%` }} />
          </div>
        </div>
        <div className="border-b border-gray-200 p-4 sm:border-b-0 sm:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">{t('validation.pendingLabel')}</p>
              <p className="text-lg font-semibold text-gray-900">{pendingDecisionReponses.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-green-50 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">{t('validation.readyLabel')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {canValidateEvaluation ? t('common.yes') : t('common.no')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm lg:sticky lg:top-20">
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="font-semibold text-gray-900">{t('validation.principles')}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{principes.length} {t('validation.principlesCount')}</p>
          </div>
          <div className="flex gap-2 overflow-x-auto p-2 lg:block lg:max-h-[calc(100vh-190px)] lg:space-y-1 lg:overflow-y-auto">
            {principes.map((principe) => {
              const { reviewed, total, hasCorrection } = getPrincipeProgress(principe);
              const isActive = activePrincipe === principe.id;
              const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0;
              return (
                <button
                  key={principe.id}
                  type="button"
                  onClick={() => selectPrinciple(principe)}
                  className={`min-w-[240px] rounded-lg border px-3 py-2.5 text-start transition-colors lg:w-full lg:min-w-0 ${
                    isActive
                      ? 'border-primary-300 bg-primary-50 text-primary-800'
                      : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                      isActive ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {principe.number}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-sm font-medium leading-5">
                        {getLocalizedField(principe, 'name', language)}
                      </span>
                      <span className="mt-2 flex items-center gap-2">
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-gray-200">
                          <span className="block h-full rounded-full bg-primary-600" style={{ width: `${percentage}%` }} />
                        </span>
                        <span className="text-[11px] text-gray-500">{reviewed}/{total}</span>
                        {hasCorrection && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="border-b border-gray-200 pb-4">
            <div className="flex flex-col gap-3 min-[1400px]:flex-row min-[1400px]:items-end min-[1400px]:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase text-gray-500">
                  {t('validation.principleNumber', { number: activePrincipeData?.number })}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">
                  {activePrincipeData ? getLocalizedField(activePrincipeData, 'name', language) : ''}
                </h2>
              </div>
              <label className="relative block w-full min-[1400px]:w-72">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t('validation.searchPlaceholder')}
                  className="input h-10 ps-9"
                />
              </label>
            </div>

            <div className="mt-4 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`flex min-h-8 flex-shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
                    filter === item.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                  <span className="text-[11px] text-gray-400">{filterCounts[item.value]}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 text-center">
              <Search className="h-7 w-7 text-gray-400" />
              <p className="mt-3 font-medium text-gray-900">{t('validation.noCriteria')}</p>
              <p className="mt-1 text-sm text-gray-500">{t('validation.noCriteriaDetail')}</p>
            </div>
          ) : activeReviewRow ? (
            <>
              <nav className="flex items-center gap-2 border border-gray-200 bg-white p-2" aria-label={t('validation.goodPracticesNavigation')}>
                <button
                  type="button"
                  onClick={() => moveToGoodPractice(-1)}
                  disabled={activeGoodPracticeIndex <= 0}
                  className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                  title={t('validation.previousGoodPractice')}
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </button>
                <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-0.5">
                  {filteredGoodPractices.map((bonnePratique, index) => {
                    const selected = bonnePratique.id === activeBonnePratiqueId;
                    return (
                      <button
                        key={bonnePratique.id}
                        type="button"
                        onClick={() => selectGoodPractice(bonnePratique.id)}
                        className={`flex h-10 min-w-[170px] max-w-[240px] flex-shrink-0 items-center gap-2 rounded-lg border px-2.5 text-start text-xs transition-colors ${
                          selected
                            ? 'border-primary-600 bg-primary-700 text-white ring-2 ring-primary-200'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                        title={getLocalizedField(bonnePratique, 'label', language)}
                        aria-label={t('validation.goodPracticePosition', { current: index + 1, total: filteredGoodPractices.length })}
                        aria-current={selected ? 'step' : undefined}
                      >
                        <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-[11px] font-bold ${selected ? 'bg-white/20' : 'bg-gray-100'}`}>
                          {bonnePratique.number}
                        </span>
                        <span className="truncate font-medium">{getLocalizedField(bonnePratique, 'label', language)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-gray-500 sm:inline">
                    {t('validation.goodPracticePosition', { current: activeGoodPracticeIndex + 1, total: filteredGoodPractices.length })}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveToGoodPractice(1)}
                    disabled={activeGoodPracticeIndex >= filteredGoodPractices.length - 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                    title={t('validation.nextGoodPractice')}
                  >
                    <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                  </button>
                </div>
              </nav>

              <nav className="flex items-center gap-2 border border-gray-200 bg-white p-2" aria-label={t('validation.criteriaNavigation')}>
                <button
                  type="button"
                  onClick={() => moveToCriterion(-1)}
                  disabled={activeReviewIndex <= 0}
                  className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                  title={t('validation.previousCriterion')}
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </button>
                <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-0.5">
                  {visibleCriterionRows.map((row, index) => {
                    const selected = row.critere.id === activeCriterionId;
                    return (
                      <button
                        key={row.critere.id}
                        type="button"
                        onClick={() => updateNavigationKeepingPosition(() => setActiveCriterionId(row.critere.id))}
                        className={criterionStepClass(row.reponse, selected)}
                        title={getLocalizedField(row.critere, 'label', language)}
                        aria-label={t('validation.criterionPosition', { current: index + 1, total: visibleCriterionRows.length })}
                        aria-current={selected ? 'step' : undefined}
                      >
                        {row.critere.number}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-gray-500 sm:inline">
                    {t('validation.criterionPosition', { current: activeReviewIndex + 1, total: visibleCriterionRows.length })}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveToCriterion(1)}
                    disabled={activeReviewIndex >= visibleCriterionRows.length - 1}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                    title={t('validation.nextCriterion')}
                  >
                    <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                  </button>
                </div>
              </nav>

              <FocusedCriterionReview
                row={activeReviewRow}
                language={language}
                note={activeReviewRow.reponse ? reviewNotes[activeReviewRow.reponse.id] || '' : ''}
                isBusy={activeReviewRow.reponse?.id === busyResponseId}
                t={t}
                onDownloadFile={handleDownloadFile}
                onReviewAction={handleReviewAction}
              />
            </>
          ) : null}

          <div className="flex items-center justify-between border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => moveToPrincipe(-1)}
              disabled={activePrincipeIndex <= 0}
              className="btn-outline btn-sm gap-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              {t('validation.previousPrinciple')}
            </button>
            <span className="text-xs text-gray-500">{activePrincipeIndex + 1} / {principes.length}</span>
            <button
              type="button"
              onClick={() => moveToPrincipe(1)}
              disabled={activePrincipeIndex >= principes.length - 1}
              className="btn-outline btn-sm gap-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('validation.nextPrinciple')}
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        </main>
      </div>

      {globalCorrectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{t('validation.returnDialogTitle')}</h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">{t('validation.returnDialogDetail')}</p>
              </div>
              <button
                type="button"
                onClick={() => setGlobalCorrectionOpen(false)}
                className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                title={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label htmlFor="global-correction-reason" className="label mt-5">
              {t('validation.globalReason')}
            </label>
            <textarea
              id="global-correction-reason"
              value={globalCorrectionReason}
              onChange={(event) => setGlobalCorrectionReason(event.target.value)}
              rows={5}
              className="input resize-y"
              placeholder={t('validation.globalReasonPlaceholder')}
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setGlobalCorrectionOpen(false)} className="btn-outline btn-sm">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleReturnEvaluation}
                disabled={isReturningEvaluation}
                className="btn-danger btn-sm gap-2 disabled:opacity-50"
              >
                {isReturningEvaluation ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {t('validation.confirmReturn')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={validateDialogOpen}
        title={t('validation.validateDialogTitle')}
        description={t('validation.evaluationValidateConfirm')}
        confirmLabel={t('validation.validateEvaluation')}
        cancelLabel={t('common.cancel')}
        busy={isValidatingEvaluation}
        onConfirm={() => void confirmValidateEvaluation()}
        onClose={() => setValidateDialogOpen(false)}
      />
    </div>
  );
}

function FocusedCriterionReview({
  row,
  language,
  note,
  isBusy,
  t,
  onDownloadFile,
  onReviewAction,
}: {
  row: CriterionRow;
  language: string;
  note: string;
  isBusy: boolean;
  t: TFunction;
  onDownloadFile: (fileUrl: string) => Promise<void>;
  onReviewAction: (reponse: Reponse, action: StatusReponse, reason?: string) => Promise<void>;
}) {
  const { bonnePratique, critere, reponse } = row;
  const references = getLocalizedField(critere, 'references', language) || t('validation.notSpecified');
  const evidenceCount = (reponse?.preuveFiles?.length || 0) + (reponse?.preuveLinks?.length || 0);
  const [reasonAction, setReasonAction] = useState<StatusReponse.A_CORRIGER | StatusReponse.REJETEE | null>(null);
  const [reason, setReason] = useState('');

  const openReasonDialog = (action: StatusReponse.A_CORRIGER | StatusReponse.REJETEE) => {
    setReasonAction(action);
    setReason(note);
  };

  const closeReasonDialog = () => {
    if (isBusy) return;
    setReasonAction(null);
    setReason('');
  };

  const confirmReasonedDecision = async () => {
    if (!reponse || !reasonAction || !reason.trim()) {
      toast.error(t('validation.reasonRequired'));
      return;
    }

    await onReviewAction(reponse, reasonAction, reason);
    setReasonAction(null);
    setReason('');
  };

  return (
    <section className="min-h-[720px] overflow-hidden border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-primary-700">
              <span>{t('validation.goodPractice')} {bonnePratique.number}</span>
              <span className="text-gray-300">/</span>
              <span>{t('validation.criterion')} {critere.number}</span>
            </div>
            <h3 className="mt-2 text-lg font-semibold leading-7 text-gray-900">
              {getLocalizedField(critere, 'label', language)}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {getLocalizedField(bonnePratique, 'label', language)}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {reponse?.niveau ? levelBadge(reponse.niveau, t) : <span className="badge bg-gray-100 text-gray-500">-</span>}
            {reponse ? statusBadge(reponse.status, t) : statusBadge(StatusReponse.BROUILLON, t)}
          </div>
        </div>
      </header>

      <section className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6" aria-labelledby={`submitted-level-${critere.id}`}>
        <div className="flex items-center justify-between gap-3">
          <h4 id={`submitted-level-${critere.id}`} className="text-sm font-semibold text-gray-900">
            {t('validation.submittedLevel')}
          </h4>
          <span className="text-xs text-gray-500">{t('validation.levelScaleHint')}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {LEVELS.map((level) => {
            const selected = reponse?.niveau === level;
            return (
              <div
                key={level}
                aria-current={selected ? 'true' : undefined}
                className={`relative min-w-0 border px-3 py-3 transition-colors ${levelScaleClasses(level, selected)}`}
              >
                <div className="flex min-h-8 items-center justify-between gap-2">
                  <span className="text-sm font-semibold leading-5">{t(getNiveauTranslationKey(level))}</span>
                  {selected && <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid min-[1280px]:grid-cols-2">
        <section className="min-w-0 p-4 sm:p-6 min-[1280px]:border-r min-[1280px]:border-gray-200">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <FileText className="h-4 w-4 text-primary-700" />
              {t('validation.evidence')}
              <span className="text-xs font-normal text-gray-500">({evidenceCount})</span>
            </h4>
            {evidenceCount === 0 ? (
              <p className="mt-3 text-sm text-gray-500">{t('validation.noEvidence')}</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {reponse?.preuveFiles?.map((fileUrl) => (
                  <button
                    key={fileUrl}
                    type="button"
                    onClick={() => onDownloadFile(fileUrl)}
                    className="inline-flex max-w-full items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-gray-100"
                  >
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{fileUrl.split('/').pop()}</span>
                    <Download className="h-3.5 w-3.5 flex-shrink-0" />
                  </button>
                ))}
                {reponse?.preuveLinks?.map((link) => (
                  <a
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-gray-100"
                  >
                    <LinkIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{link}</span>
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}
        </section>

        <section className="border-t border-gray-200 bg-white p-4 sm:p-6 min-[1280px]:border-t-0">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <BookOpenCheck className="h-4 w-4 text-secondary-600" />
            {t('validation.references')}
          </h4>
          <p className="mt-3 whitespace-pre-wrap border-s-2 border-secondary-300 ps-4 text-sm leading-7 text-gray-700">
            {references}
          </p>
        </section>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 p-4 sm:px-6 sm:py-5">
        {reponse ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-gray-900">{t('validation.decision')}</h4>
                {isBusy && <Loader2 className="h-4 w-4 animate-spin text-primary-700" />}
              </div>
              <p className="mt-1 text-xs leading-5 text-gray-500">{t('validation.decisionHint')}</p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[520px]">
              <DecisionButton
                label={t('validation.tooltipValidate')}
                icon={CheckCircle2}
                tone="green"
                selected={reponse.status === StatusReponse.VALIDEE}
                disabled={isBusy}
                onClick={() => onReviewAction(reponse, StatusReponse.VALIDEE)}
              />
              <DecisionButton
                label={t('validation.tooltipCorrection')}
                icon={RotateCcw}
                tone="amber"
                selected={reponse.status === StatusReponse.A_CORRIGER}
                disabled={isBusy}
                onClick={() => openReasonDialog(StatusReponse.A_CORRIGER)}
              />
              <DecisionButton
                label={t('validation.tooltipReject')}
                icon={XCircle}
                tone="red"
                selected={reponse.status === StatusReponse.REJETEE}
                disabled={isBusy}
                onClick={() => openReasonDialog(StatusReponse.REJETEE)}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {t('validation.responseUnavailable')}
          </div>
        )}
      </div>

      {reasonAction && reponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="criterion-reason-title">
          <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="criterion-reason-title" className="text-lg font-semibold text-gray-900">
                  {reasonAction === StatusReponse.A_CORRIGER
                    ? t('validation.correctionDialogTitle')
                    : t('validation.rejectionDialogTitle')}
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {reasonAction === StatusReponse.A_CORRIGER
                    ? t('validation.correctionDialogDetail')
                    : t('validation.rejectionDialogDetail')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReasonDialog}
                disabled={isBusy}
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                title={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label htmlFor={`criterion-reason-${reponse.id}`} className="mt-5 block text-sm font-medium text-gray-700">
              {t('validation.reasonLabel')}
            </label>
            <textarea
              id={`criterion-reason-${reponse.id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              className="input mt-1.5 resize-y"
              placeholder={t('validation.reasonPlaceholder')}
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeReasonDialog} disabled={isBusy} className="btn-outline btn-sm">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmReasonedDecision}
                disabled={isBusy || !reason.trim()}
                className={`${reasonAction === StatusReponse.REJETEE ? 'btn-danger' : 'btn-primary'} btn-sm gap-2 disabled:opacity-50`}
              >
                {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('validation.confirmDecision')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const LEVELS = [Niveau.N0, Niveau.N1, Niveau.N2, Niveau.N3] as const;

function levelScaleClasses(level: Niveau, selected: boolean) {
  const selectedClasses: Record<Niveau, string> = {
    [Niveau.N0]: 'border-red-500 bg-red-50 text-red-800 ring-1 ring-red-200',
    [Niveau.N1]: 'border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    [Niveau.N2]: 'border-sky-500 bg-sky-50 text-sky-800 ring-1 ring-sky-200',
    [Niveau.N3]: 'border-green-500 bg-green-50 text-green-800 ring-1 ring-green-200',
  };
  return selected ? selectedClasses[level] : 'border-gray-200 bg-white text-gray-500';
}

function criterionStepClass(reponse: Reponse | undefined, selected: boolean) {
  const base = 'flex h-9 min-w-9 flex-shrink-0 items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors';
  if (selected) return `${base} border-primary-600 bg-primary-700 text-white ring-2 ring-primary-200`;
  if (reponse?.status === StatusReponse.VALIDEE) return `${base} border-green-200 bg-green-50 text-green-700 hover:bg-green-100`;
  if (reponse?.status === StatusReponse.A_CORRIGER) return `${base} border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`;
  if (reponse?.status === StatusReponse.REJETEE) return `${base} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`;
  return `${base} border-gray-200 bg-white text-gray-600 hover:bg-gray-100`;
}

function DecisionButton({
  label,
  icon: Icon,
  tone,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof CheckCircle2;
  tone: 'green' | 'amber' | 'red';
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const toneClasses = {
    green: selected
      ? 'border-green-600 bg-green-600 text-white'
      : 'border-green-200 bg-white text-green-700 hover:bg-green-50',
    amber: selected
      ? 'border-amber-500 bg-amber-500 text-white'
      : 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50',
    red: selected
      ? 'border-red-600 bg-red-600 text-white'
      : 'border-red-200 bg-white text-red-700 hover:bg-red-50',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex min-h-[48px] min-w-0 items-center justify-center gap-2 rounded-md border px-3 py-2 text-center text-xs font-semibold leading-4 transition-colors disabled:cursor-wait disabled:opacity-60 ${toneClasses[tone]}`}
      title={label}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="break-words">{label}</span>
    </button>
  );
}

function levelBadge(niveau: string, t: TFunction) {
  const colors: Record<string, string> = {
    N0: 'bg-red-100 text-red-700',
    N1: 'bg-amber-100 text-amber-700',
    N2: 'bg-blue-100 text-blue-700',
    N3: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`badge ${colors[niveau] || 'bg-gray-100 text-gray-600'}`}>
      <span>{t(getNiveauTranslationKey(niveau))}</span>
    </span>
  );
}

function statusBadge(status: StatusReponse, t: TFunction) {
  const colors: Record<StatusReponse, string> = {
    [StatusReponse.VALIDEE]: 'bg-green-100 text-green-700',
    [StatusReponse.REJETEE]: 'bg-red-100 text-red-700',
    [StatusReponse.A_CORRIGER]: 'bg-amber-100 text-amber-700',
    [StatusReponse.BROUILLON]: 'bg-gray-100 text-gray-600',
    [StatusReponse.SOUMISE]: 'bg-blue-100 text-blue-700',
  };
  return <span className={`badge text-xs ${colors[status]}`}>{t(`reponseStatus.${status}`)}</span>;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || fallback;
  }
  return fallback;
}
