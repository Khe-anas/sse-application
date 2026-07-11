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

  const levelBadge = (niveau?: string) => {
    if (!niveau) return null;
    const colors: Record<string, string> = {
      N0: 'bg-red-100 text-red-700', N1: 'bg-amber-100 text-amber-700',
      N2: 'bg-blue-100 text-blue-700', N3: 'bg-green-100 text-green-700',
    };
    return <span className={`badge ${colors[niveau] || 'bg-gray-100 text-gray-600'}`}>{niveau}</span>;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      VALIDEE: 'bg-green-100 text-green-700', REJETEE: 'bg-red-100 text-red-700',
      A_CORRIGER: 'bg-amber-100 text-amber-700', BROUILLON: 'bg-gray-100 text-gray-600',
      SOUMISE: 'bg-blue-100 text-blue-700',
    };
    return <span className={`badge text-xs ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{t(`reponseStatus.${status}`)}</span>;
  };

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
          ? current : princData[0]?.id || ''
      );
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

  useEffect(() => {
    if (!id) return undefined;
    const keepLockAlive = () => {
      if (!document.hidden) { void evaluationService.claimValidation(id).catch(() => undefined); }
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
      [updatedReponse.principeId]: (current[updatedReponse.principeId] || []).map((r) =>
        r.id === updatedReponse.id ? updatedReponse : r
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
    try { await fileService.download(fileUrl); }
    catch (error) { toast.error(t('validation.downloadError')); }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    try { await reportService.downloadPdf(id); }
    catch (error) { toast.error(t('evaluationRead.downloadError')); }
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

  const actionBtnClass = (reponse: Reponse, action: string, color: 'green' | 'red' | 'amber') => {
    const selected = reponse.status === action;
    const hasDecision = hasAdminDecision(reponse);
    if (!selected && hasDecision) return 'p-1.5 rounded transition-colors bg-gray-100 text-gray-300 cursor-not-allowed';

    const classes = {
      green: selected ? 'bg-green-600 text-white ring-2 ring-green-200' : 'bg-green-100 text-green-700 hover:bg-green-200',
      red: selected ? 'bg-red-600 text-white ring-2 ring-red-200' : 'bg-red-100 text-red-700 hover:bg-red-200',
      amber: selected ? 'bg-amber-500 text-white ring-2 ring-amber-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    };
    return `p-1.5 rounded transition-colors ${classes[color]}`;
  };

  if (isLoading || !evaluation) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/evaluations')} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('validation.title', { organisme: evaluation.organismeName })} - {evaluation.year}</h1>
            <div className="flex items-center gap-2 mt-1">
              {pendingDecisionReponses.length > 0 && (
                <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                  {t('validation.pendingActions', { count: pendingDecisionReponses.length })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownloadPdf} className="btn-outline gap-2 text-sm"><Download className="w-4 h-4" /> PDF</button>
          <button onClick={handleRejectEvaluation} className="btn-danger gap-2 text-sm"><X className="w-4 h-4" /> {t('validation.reject')}</button>
          <button onClick={handleValidateEvaluation} disabled={!canValidateEvaluation}
            className="btn-success gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Check className="w-4 h-4" /> {t('validation.validateEvaluation')}
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {principes.map((p) => {
          const { completed, total, hasCorrection } = getPrincipeProgress(p);
          return (
            <button key={p.id} onClick={() => setActivePrincipe(p.id)}
              className={`relative flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePrincipe === p.id ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {hasCorrection && <span className={`absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-500 ${activePrincipe === p.id ? 'ring-2 ring-white' : ''}`} />}
              {p.number}. {getLocalizedField(p, 'name', language)}
              <span className="ml-1 opacity-70">({completed}/{total})</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700 w-10">N°</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700">BP</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Critère</th>
              <th className="px-3 py-2.5 text-center font-semibold text-gray-700 w-14">Niveau</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700 min-w-[160px]">Commentaire & Preuves</th>
              <th className="px-3 py-2.5 text-center font-semibold text-gray-700 w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {principes.filter(p => p.id === activePrincipe).map((principe) => {
              const bpCriteres = principe.bonnesPratiques.flatMap(bp =>
                bp.criteres.map(c => ({ principe, bp, critere: c }))
              );
              const groups: { bp: any; rows: { principe: any; bp: any; critere: any }[] }[] = [];
              bpCriteres.forEach((row) => {
                let g = groups.find(x => x.bp.id === row.bp.id);
                if (!g) { g = { bp: row.bp, rows: [] }; groups.push(g); }
                g.rows.push(row);
              });
              let globalIdx = 0;
              return groups.flatMap((group) =>
                group.rows.map((row, ci) => {
                  const idx = ++globalIdx;
                  const reponse = (reponses[principe.id] || []).find(r => r.critereId === row.critere.id);
                  const isFirstInGroup = ci === 0;
                  return (
                    <tr key={row.critere.id} className={`hover:bg-gray-50 ${reponse?.status === StatusReponse.A_CORRIGER ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-3 py-2 text-gray-500 align-top">{idx}</td>
                      {isFirstInGroup ? <td className="px-3 py-2 text-gray-700 align-top text-xs align-middle" rowSpan={group.rows.length}>{getLocalizedField(row.bp, 'label', language)}</td> : null}
                      <td className="px-3 py-2 text-gray-900 align-top">
                        <span className="font-medium">{row.critere.number}.</span> {getLocalizedField(row.critere, 'label', language)}
                        {(reponse?.validatorComment || reponse?.rejectionReason) && (
                          <div className="mt-1 text-xs text-amber-700 bg-amber-50 rounded p-1.5">
                            {reponse.validatorComment && <p>{reponse.validatorComment}</p>}
                            {reponse.rejectionReason && <p className="text-red-600">{reponse.rejectionReason}</p>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center align-top">
                        {reponse?.niveau ? levelBadge(reponse.niveau) : <span className="text-xs text-gray-400">-</span>}
                        {reponse && <div className="mt-0.5">{statusBadge(reponse.status)}</div>}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {reponse?.commentaire && <p className="text-xs text-gray-600 mb-1">{reponse.commentaire}</p>}
                        {(reponse?.preuveFiles?.length || 0) > 0 && (
                          <div className="space-y-0.5">
                            {reponse?.preuveFiles?.map((fileUrl) => (
                              <button key={fileUrl} type="button" onClick={() => handleDownloadFile(fileUrl)}
                                className="flex items-center gap-1 text-xs text-primary-700 hover:underline">
                                <FileText className="w-3 h-3" /> {fileUrl.split('/').pop()}
                              </button>
                            ))}
                          </div>
                        )}
                        {(reponse?.preuveLinks?.length || 0) > 0 && (
                          <div className="space-y-0.5 mt-0.5">
                            {reponse?.preuveLinks?.map((link) => (
                              <a key={link} href={link} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-primary-700 hover:underline">
                                <LinkIcon className="w-3 h-3" /> {link}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {reponse && (
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleValidateReponse(reponse.id)}
                              className={actionBtnClass(reponse, StatusReponse.VALIDEE, 'green')}
                              title={t('validation.tooltipValidate')} disabled={hasAdminDecision(reponse) && reponse.status !== StatusReponse.VALIDEE}>
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleRejectReponse(reponse.id)}
                              className={actionBtnClass(reponse, StatusReponse.REJETEE, 'red')}
                              title={t('validation.tooltipReject')} disabled={hasAdminDecision(reponse) && reponse.status !== StatusReponse.REJETEE}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleRequestCorrection(reponse.id)}
                              className={actionBtnClass(reponse, StatusReponse.A_CORRIGER, 'amber')}
                              title={t('validation.tooltipCorrection')} disabled={hasAdminDecision(reponse) && reponse.status !== StatusReponse.A_CORRIGER}>
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || fallback;
  }
  return fallback;
}
