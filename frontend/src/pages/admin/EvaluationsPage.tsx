import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, ClipboardList, Download, Eye, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { evaluationService } from '@/services/evaluationService';
import { organismeService } from '@/services/organismeService';
import { reportService } from '@/services/reportService';
import { useAuthStore } from '@/stores/authStore';
import { Role, StatusEvaluation } from '@/types';
import type { Evaluation, PageResponse, Organisme } from '@/types';
import KPICard from '@/components/dashboard/KPICard';

export default function EvaluationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [evaluations, setEvaluations] = useState<PageResponse<Evaluation> | null>(null);
  const [organismes, setOrganismes] = useState<Organisme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingEvaluationId, setClaimingEvaluationId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ organismeId: '', year: new Date().getFullYear() });
  const isAdmin = user?.role === Role.ADMIN;
  const isEvaluateur = user?.role === Role.EVALUATEUR;
  const isGovernment = user?.role === Role.GOUVERNEMENT;

  const loadData = useCallback(async (showError = true) => {
    try {
      const evalsPromise = evaluationService.getAll({ _ts: Date.now() });
      const [evalsData, orgsData] = isAdmin
        ? await Promise.all([evalsPromise, organismeService.getAll({ size: 100 })])
        : [await evalsPromise, null];
      setEvaluations(evalsData);
      if (orgsData) setOrganismes(orgsData.content);
    } catch (error) {
      if (showError) toast.error(t('evaluations.loadError'));
    }
    finally { setIsLoading(false); }
  }, [t, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) {
        void loadData(false);
      }
    };

    const interval = window.setInterval(refresh, 3000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await evaluationService.create({ organismeId: formData.organismeId, year: formData.year });
      toast.success(t('evaluations.created'));
      setShowModal(false);
      loadData();
    } catch (error) { toast.error(t('evaluations.createError')); }
  };

  const handleDownloadPdf = async (evaluationId: string) => {
    try {
      await reportService.downloadPdf(evaluationId);
    } catch (error) {
      toast.error(t('evaluationRead.downloadError'));
    }
  };

  const handleExamine = async (evaluation: Evaluation) => {
    if (isEvaluationLockedByOther(evaluation, user?.id)) {
      toast.error(t('evaluations.lockedBy', { name: evaluation.validationOpenedByName }));
      return;
    }

    setClaimingEvaluationId(evaluation.id);
    try {
      await evaluationService.claimValidation(evaluation.id);
      navigate(`/${isAdmin ? 'admin' : 'evaluateur'}/evaluations/${evaluation.id}/validate`);
    } catch (error) {
      toast.error(getErrorMessage(error, t('evaluations.claimError')));
      loadData();
    } finally {
      setClaimingEvaluationId(null);
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
    <div className="page-shell">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('navigation.evaluations')}</h1>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
            <Plus className="w-4 h-4" /> {t('evaluations.new')}
          </button>
        )}
      </div>

      <KPICard title={t('evaluations.total')} value={evaluations?.totalElements || 0} icon={ClipboardList} color="primary" />

      <div className="table-container">
        <table className="table">
          <thead className="table-head"><tr><th className="table-th">{t('common.organisme')}</th><th className="table-th">{t('common.year')}</th><th className="table-th">{t('common.status')}</th><th className="table-th">{t('common.progress')}</th><th className="table-th">{t('common.score')}</th><th className="table-th">{t('common.actions')}</th></tr></thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? <tr><td colSpan={6} className="table-td text-center py-8">{t('common.loading')}</td></tr> :
             evaluations?.content.length === 0 ? <tr><td colSpan={6} className="table-td text-center py-8">{t('evaluations.empty')}</td></tr> :
             evaluations?.content.map((ev) => (
              <tr key={ev.id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{ev.organismeName}</td>
                <td className="table-td">{ev.year}</td>
                <td className="table-td"><span className={`badge ${statusColors[ev.status]}`}>{t(`evaluation.status.${ev.status}`)}</span></td>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full"><div className="h-full bg-primary-600 rounded-full" style={{ width: `${ev.progressPercentage}%` }} /></div>
                    <span className="text-xs text-gray-500">{ev.progressPercentage}%</span>
                  </div>
                </td>
                <td className="table-td">{ev.globalScore != null ? `${ev.globalScore.toFixed(1)}%` : '-'}</td>
                <td className="table-td">
                  {(() => {
                    const canExamine = (isAdmin || isEvaluateur) && (ev.status === StatusEvaluation.SOUMISE || ev.status === StatusEvaluation.EN_VALIDATION);
                    const canReadOnly = ev.status === StatusEvaluation.VALIDEE && (isAdmin || isGovernment || isEvaluateur);

                    if (!canExamine && !canReadOnly) {
                      return <span className="text-gray-400">-</span>;
                    }

                    return (
                      <div className="flex flex-wrap items-center gap-2">
                        {canExamine && (
                          <button
                            onClick={() => handleExamine(ev)}
                            disabled={isEvaluationLockedByOther(ev, user?.id) || claimingEvaluationId === ev.id}
                            className="btn-outline btn-sm gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              isEvaluationLockedByOther(ev, user?.id)
                                ? t('evaluations.lockedBy', { name: ev.validationOpenedByName })
                                : undefined
                            }
                          >
                            {isEvaluationLockedByOther(ev, user?.id) ? <Lock className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {isEvaluationLockedByOther(ev, user?.id) ? t('evaluations.locked') : t('evaluations.examine')}
                          </button>
                        )}
                        {canReadOnly && (
                          <>
                            <button
                              onClick={() => navigate(`/evaluations/${ev.id}/view`)}
                              className="btn-outline btn-sm gap-2"
                            >
                              <Eye className="w-4 h-4" /> {t('common.details')}
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(ev.id)}
                              className="btn-outline btn-sm gap-2"
                            >
                              <Download className="w-4 h-4" /> PDF
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4">{t('evaluations.modalTitle')}</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="label">{t('evaluations.organismeLabel')} *</label>
                <select required className="select" value={formData.organismeId} onChange={(e) => setFormData({ ...formData, organismeId: e.target.value })}>
                  <option value="">{t('common.selectPlaceholder')}</option>
                  {organismes.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div><label className="label">{t('evaluations.yearLabel')} *</label><input type="number" required className="input" value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">{t('common.cancel')}</button>
                <button type="submit" className="btn-primary">{t('evaluations.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function isEvaluationLockedByOther(evaluation: Evaluation, userId?: string) {
  return (evaluation.status === StatusEvaluation.SOUMISE || evaluation.status === StatusEvaluation.EN_VALIDATION)
    && Boolean(evaluation.validationOpenedById && evaluation.validationOpenedById !== userId);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || fallback;
  }
  return fallback;
}
