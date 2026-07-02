import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ChevronLeft, Check, Download, X, RotateCcw, FileText, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { evaluationService, reponseService } from '@/services/evaluationService';
import { fileService } from '@/services/fileService';
import { reportService } from '@/services/reportService';
import { StatusEvaluation, StatusReponse, type Evaluation, type Reponse, type Principe } from '@/types';
import api from '@/services/api';
import { getLocalizedField } from '@/utils/localization';

export default function EvaluationValidatePage() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [principes, setPrincipes] = useState<Principe[]>([]);
  const [reponses, setReponses] = useState<Record<string, Reponse[]>>({});
  const [activePrincipe, setActivePrincipe] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const hasAdminDecision = (reponse: Reponse) =>
    reponse.status === StatusReponse.VALIDEE
    || reponse.status === StatusReponse.REJETEE
    || reponse.status === StatusReponse.A_CORRIGER;

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [evalData, princData] = await Promise.all([
        evaluationService.claimValidation(id),
        api.get<Principe[]>('/principes').then(r => r.data),
      ]);
      setEvaluation(evalData);
      setPrincipes(princData);
      setActivePrincipe((current) =>
        current && princData.some((principe) => principe.id === current)
          ? current
          : princData[0]?.id || ''
      );
      
      // Load reponses for each principe
      const repMap: Record<string, Reponse[]> = {};
      for (const p of princData) {
        const reps = await reponseService.getByEvaluation(id, p.id);
        repMap[p.id] = reps;
      }
      setReponses(repMap);
    } catch (error) {
      toast.error(getErrorMessage(error, t('validation.loadError')));
      navigate('/admin/evaluations');
    }
    finally { setIsLoading(false); }
  }, [id, navigate, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateReponseInState = (updatedReponse: Reponse) => {
    setReponses((current) => ({
      ...current,
      [updatedReponse.principeId]: (current[updatedReponse.principeId] || []).map((reponse) =>
        reponse.id === updatedReponse.id ? updatedReponse : reponse
      ),
    }));
  };

  const handleValidateReponse = async (reponseId: string) => {
    try {
      const response = await api.put<Reponse>(`/reponses/${reponseId}/validate`, {});
      updateReponseInState(response.data);
      toast.success(t('validation.responseValidated'));
    } catch (error) { toast.error(getErrorMessage(error, t('validation.error'))); }
  };

  const handleRejectReponse = async (reponseId: string) => {
    const reason = prompt(t('validation.rejectReasonPrompt'));
    if (!reason) return;
    try {
      const response = await api.put<Reponse>(`/reponses/${reponseId}/reject`, { reason });
      updateReponseInState(response.data);
      toast.success(t('validation.responseRejected'));
    } catch (error) { toast.error(getErrorMessage(error, t('validation.error'))); }
  };

  const handleRequestCorrection = async (reponseId: string) => {
    const reason = prompt(t('validation.correctionReasonPrompt'));
    if (!reason) return;
    try {
      const response = await api.put<Reponse>(`/reponses/${reponseId}/request-correction`, { reason });
      updateReponseInState(response.data);
      setEvaluation((current) => current ? { ...current, status: StatusEvaluation.EN_COURS } : current);
      toast.success(t('validation.correctionRequested'));
    } catch (error) { toast.error(getErrorMessage(error, t('validation.error'))); }
  };

  const handleDownloadFile = async (fileUrl: string) => {
    try {
      await fileService.download(fileUrl);
    } catch (error) {
      toast.error(t('validation.downloadError'));
    }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;

    try {
      await reportService.downloadPdf(id);
    } catch (error) {
      toast.error(t('evaluationRead.downloadError'));
    }
  };

  const getPrincipeProgress = (principe: Principe) => {
    const principeReponses = reponses[principe.id] || [];
    const total = principe.bonnesPratiques.reduce((count, bp) => count + bp.criteres.length, 0);
    const completed = principeReponses.filter((reponse) =>
      reponse.niveau != null && reponse.status !== StatusReponse.A_CORRIGER
    ).length;
    const hasCorrection = principeReponses.some((reponse) => reponse.status === StatusReponse.A_CORRIGER);

    return { completed, total, hasCorrection };
  };

  const allReponses = Object.values(reponses).flat();
  const pendingDecisionReponses = allReponses.filter((reponse) => !hasAdminDecision(reponse));
  const canValidateEvaluation =
    pendingDecisionReponses.length === 0
    && allReponses.length > 0
    && (evaluation?.status === StatusEvaluation.SOUMISE || evaluation?.status === StatusEvaluation.EN_VALIDATION);

  const actionButtonClass = (
    status: string,
    selectedStatus: string,
    color: 'green' | 'red' | 'amber',
  ) => {
    const selected = status === selectedStatus;
    const hasDecision = status === 'VALIDEE' || status === 'REJETEE' || status === 'A_CORRIGER';

    if (!selected && hasDecision) {
      return 'p-2 rounded-lg transition-colors bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600';
    }

    const classes = {
      green: selected
        ? 'bg-green-600 text-white ring-2 ring-green-200 hover:bg-green-700'
        : 'bg-green-100 text-green-700 hover:bg-green-200',
      red: selected
        ? 'bg-red-600 text-white ring-2 ring-red-200 hover:bg-red-700'
        : 'bg-red-100 text-red-700 hover:bg-red-200',
      amber: selected
        ? 'bg-amber-500 text-white ring-2 ring-amber-200 hover:bg-amber-600'
        : 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    };

    return `p-2 rounded-lg transition-colors ${classes[color]}`;
  };

  const handleValidateEvaluation = async () => {
    if (!id) return;
    if (pendingDecisionReponses.length > 0) {
      toast.error(t('validation.pendingActionsBlock', { count: pendingDecisionReponses.length }));
      setActivePrincipe(pendingDecisionReponses[0].principeId);
      return;
    }
    if (!canValidateEvaluation) {
      toast.error(t('validation.evaluationNotReady'));
      return;
    }
    if (!confirm(t('validation.evaluationValidateConfirm'))) return;
    try {
      await evaluationService.validate(id);
      toast.success(t('validation.evaluationValidated'));
      navigate('/admin/evaluations');
    } catch (error) { toast.error(getErrorMessage(error, t('validation.evaluationValidatedError'))); }
  };

  const handleRejectEvaluation = async () => {
    if (!id) return;
    const reason = prompt(t('validation.evaluationRejectReasonPrompt'));
    if (!reason) return;
    try {
      await evaluationService.reject(id, reason);
      toast.success(t('validation.evaluationRejected'));
      navigate('/admin/evaluations');
    } catch (error) { toast.error(getErrorMessage(error, t('validation.error'))); }
  };

  if (isLoading || !evaluation) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/evaluations')} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('validation.title', { organisme: evaluation.organismeName })}</h1>
            <p className="text-gray-500">{t('validation.year', { year: evaluation.year })}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pendingDecisionReponses.length > 0 && (
            <span className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
              {t('validation.pendingActions', { count: pendingDecisionReponses.length })}
            </span>
          )}
          <button onClick={handleDownloadPdf} className="btn-outline gap-2">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={handleRejectEvaluation} className="btn-danger gap-2">
            <X className="w-4 h-4" /> {t('validation.reject')}
          </button>
          <button
            onClick={handleValidateEvaluation}
            disabled={!canValidateEvaluation}
            className="btn-success gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            title={
              pendingDecisionReponses.length > 0
                ? t('validation.pendingActionsBlock', { count: pendingDecisionReponses.length })
                : !canValidateEvaluation
                  ? t('validation.evaluationNotReady')
                  : undefined
            }
          >
            <Check className="w-4 h-4" /> {t('validation.validateEvaluation')}
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {principes.map((p) => {
          const { completed, total, hasCorrection } = getPrincipeProgress(p);

          return (
            <button
              key={p.id}
              onClick={() => setActivePrincipe(p.id)}
              className={`relative flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePrincipe === p.id ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {hasCorrection && (
                <span className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ${
                  activePrincipe === p.id ? 'ring-2 ring-white' : ''
                }`} />
              )}
              {p.number}. {getLocalizedField(p, 'name', language)}
              <span className="ml-1 opacity-70">({completed}/{total})</span>
            </button>
          );
        })}
      </div>

      {principes.filter(p => p.id === activePrincipe).map((principe) => (
        <div key={principe.id} className="space-y-4">
          {principe.bonnesPratiques.map((bp) => (
            <div key={bp.id} className="card">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">{getLocalizedField(bp, 'label', language)}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {(reponses[principe.id] || [])
                  .filter(r => r.bonnePratiqueId === bp.id)
                  .map((reponse) => (
                    <div key={reponse.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{reponse.critereLabel}</p>
                          {reponse.commentaire && <p className="text-sm text-gray-500 mt-1">{reponse.commentaire}</p>}
                          {((reponse.preuveFiles?.length || 0) > 0 || (reponse.preuveLinks?.length || 0) > 0) && (
                            <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {t('validation.evidence')}
                              </p>
                              <div className="space-y-1.5">
                                {reponse.preuveFiles?.map((fileUrl) => (
                                  <button
                                    key={fileUrl}
                                    type="button"
                                    onClick={() => handleDownloadFile(fileUrl)}
                                    className="flex max-w-full min-w-0 items-center gap-2 text-left text-xs text-primary-700 hover:underline"
                                  >
                                    <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="min-w-0 truncate">{t('validation.fileLabel')} {fileUrl.split('/').pop()}</span>
                                  </button>
                                ))}
                                {reponse.preuveLinks?.map((preuveLink) => (
                                  <a
                                    key={preuveLink}
                                    href={preuveLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex max-w-full min-w-0 items-center gap-2 text-xs text-primary-700 hover:underline"
                                  >
                                    <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="min-w-0 truncate">{t('validation.linkLabel')} {preuveLink}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`badge ${
                              reponse.niveau === 'N0' ? 'bg-red-100 text-red-700' :
                              reponse.niveau === 'N1' ? 'bg-amber-100 text-amber-700' :
                              reponse.niveau === 'N2' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {reponse.niveau}
                            </span>
                            <span className={`badge ${
                              reponse.status === 'VALIDEE' ? 'bg-green-100 text-green-700' :
                              reponse.status === 'REJETEE' ? 'bg-red-100 text-red-700' :
                              reponse.status === 'A_CORRIGER' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {t(`reponseStatus.${reponse.status}`)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleValidateReponse(reponse.id)}
                            className={actionButtonClass(reponse.status, 'VALIDEE', 'green')}
                            title={t('validation.tooltipValidate')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectReponse(reponse.id)}
                            className={actionButtonClass(reponse.status, 'REJETEE', 'red')}
                            title={t('validation.tooltipReject')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRequestCorrection(reponse.id)}
                            className={actionButtonClass(reponse.status, 'A_CORRIGER', 'amber')}
                            title={t('validation.tooltipCorrection')}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || fallback;
  }
  return fallback;
}
