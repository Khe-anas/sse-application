import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Link,
  Paperclip,
  Save,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { evaluationService, reponseService } from '@/services/evaluationService';
import { fileService } from '@/services/fileService';
import { Niveau, StatusEvaluation, StatusReponse } from '@/types';
import type { BonnePratique, Critere, Evaluation, Reponse, Principe } from '@/types';
import api from '@/services/api';
import { getLocalizedField } from '@/utils/localization';
import { getNiveauTranslationKey } from '@/utils/niveau';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ProgressMeter from '@/components/ui/ProgressMeter';

const niveaux: { key: Niveau; label: string; color: string }[] = [
  { key: Niveau.N0, label: 'evaluation.niveau0', color: 'bg-red-100 text-red-700 border-red-200' },
  { key: Niveau.N1, label: 'evaluation.niveau1', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: Niveau.N2, label: 'evaluation.niveau2', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: Niveau.N3, label: 'evaluation.niveau3', color: 'bg-green-100 text-green-700 border-green-200' },
];

export default function EvaluationFillPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [principes, setPrincipes] = useState<Principe[]>([]);
  const [reponses, setReponses] = useState<Record<string, Reponse>>({});
  const [activePrincipe, setActivePrincipe] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [touchedCorrectionIds, setTouchedCorrectionIds] = useState<Set<string>>(new Set());
  const [activeCriterionId, setActiveCriterionId] = useState('');
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [linkDialogCritereId, setLinkDialogCritereId] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [evalData, princData, repData] = await Promise.all([
        evaluationService.getById(id),
        api.get<Principe[]>('/principes').then(r => r.data),
        reponseService.getByEvaluation(id),
      ]);
      setEvaluation(evalData);
      setPrincipes(princData);
      const repMap: Record<string, Reponse> = {};
      repData.forEach(r => { repMap[r.critereId] = r; });
      setReponses(repMap);
      setTouchedCorrectionIds(new Set());
      if (princData.length > 0) setActivePrincipe(princData[0].id);
    } catch (error) { toast.error(t('evaluationFill.loadError')); }
    finally { setIsLoading(false); }
  }, [id, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const isCorrectionStatus = (status: StatusReponse | undefined) =>
    status === StatusReponse.A_CORRIGER || status === StatusReponse.REJETEE;

  const canEditReponse = (reponse: Reponse | undefined) =>
    evaluation?.status === StatusEvaluation.EN_COURS
    && !!reponse
    && (reponse.status === StatusReponse.BROUILLON || isCorrectionStatus(reponse.status));

  const canEditCritere = (critereId: string) => canEditReponse(reponses[critereId]);

  const isCorrectionAddressed = (reponse: Reponse | undefined) =>
    !!reponse
    && (!isCorrectionStatus(reponse.status)
        || Boolean(reponse.correctionAddressed)
        || touchedCorrectionIds.has(reponse.critereId));

  const isReponseComplete = (reponse: Reponse | undefined) =>
    !!reponse && reponse.niveau != null && isCorrectionAddressed(reponse);

  const saveReponseDraft = async (reponse: Reponse) => {
    if (!id) return;
    setSaveState('saving');
    try {
      const updatedReponses = await reponseService.saveBatch(id, [{
        critereId: reponse.critereId,
        niveau: reponse.niveau,
        commentaire: reponse.commentaire,
        preuveLinks: reponse.preuveLinks,
        correctionAddressed: Boolean(reponse.correctionAddressed) || touchedCorrectionIds.has(reponse.critereId),
      }]);
      const updated = updatedReponses.find((item) => item.critereId === reponse.critereId);
      if (updated) setReponses(prev => ({ ...prev, [updated.critereId]: updated }));
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      toast.error(t('evaluationFill.saveError'));
    }
  };

  const handleNiveauChange = (critereId: string, niveau: Niveau) => {
    if (!canEditCritere(critereId)) return;
    const existing = reponses[critereId];
    const isCorrection = isCorrectionStatus(existing?.status);
    const updated = {
      ...existing, critereId, niveau,
      status: existing?.status || StatusReponse.BROUILLON,
      correctionAddressed: isCorrection ? true : existing?.correctionAddressed,
    } as Reponse;
    setReponses(prev => ({ ...prev, [critereId]: updated }));
    if (isCorrection) {
      setTouchedCorrectionIds(prev => { const next = new Set(prev); next.add(critereId); return next; });
    }
    void saveReponseDraft(updated);
  };

  const handleCommentChange = (critereId: string, commentaire: string) => {
    if (!canEditCritere(critereId)) return;
    const existing = reponses[critereId];
    const isCorrection = isCorrectionStatus(existing?.status);
    const updated = {
      ...existing,
      commentaire,
      correctionAddressed: isCorrection ? true : existing?.correctionAddressed,
    } as Reponse;
    setReponses(prev => ({ ...prev, [critereId]: updated }));
    if (isCorrection) {
      setTouchedCorrectionIds(prev => { const next = new Set(prev); next.add(critereId); return next; });
    }
  };

  const handleAddLink = (critereId: string) => {
    if (!canEditCritere(critereId)) return;
    setLinkInput('');
    setLinkDialogCritereId(critereId);
  };

  const confirmAddLink = () => {
    if (!linkDialogCritereId) return;
    const critereId = linkDialogCritereId;
    const trimmedUrl = linkInput.trim();
    if (!trimmedUrl) return;
    const existing = reponses[critereId];
    const isCorrection = isCorrectionStatus(existing?.status);
    const updated = {
      ...existing, critereId,
      preuveLinks: [...(existing?.preuveLinks || []), trimmedUrl],
      status: existing?.status || StatusReponse.BROUILLON,
      correctionAddressed: isCorrection ? true : existing?.correctionAddressed,
    } as Reponse;
    setReponses(prev => ({ ...prev, [critereId]: updated }));
    if (isCorrection) {
      setTouchedCorrectionIds(prev => { const next = new Set(prev); next.add(critereId); return next; });
    }
    void saveReponseDraft(updated);
    setLinkDialogCritereId(null);
    setLinkInput('');
  };

  const handleRemoveLink = (critereId: string, linkToRemove: string) => {
    if (!canEditCritere(critereId)) return;
    const existing = reponses[critereId];
    if (!existing) return;
    const updated = {
      ...existing,
      preuveLinks: (existing.preuveLinks || []).filter(link => link !== linkToRemove),
      correctionAddressed: isCorrectionStatus(existing.status) ? true : existing.correctionAddressed,
    } as Reponse;
    setReponses(prev => ({ ...prev, [critereId]: updated }));
    if (isCorrectionStatus(existing.status)) {
      setTouchedCorrectionIds(prev => { const next = new Set(prev); next.add(critereId); return next; });
    }
    void saveReponseDraft(updated);
  };

  const handleFileUpload = async (critereId: string, files?: FileList | File[]) => {
    if (!canEditCritere(critereId)) return;
    const filesToUpload = Array.from(files || []);
    if (filesToUpload.length === 0) return;
    const reponse = reponses[critereId];
    if (!reponse?.id) { toast.error(t('evaluationFill.notFound')); return; }
    try {
      const uploadedFileUrls: string[] = [];
      for (const file of filesToUpload) uploadedFileUrls.push(await reponseService.uploadProof(reponse.id, file));
      setReponses(prev => {
        const existing = prev[critereId];
        return {
          ...prev,
          [critereId]: {
            ...existing,
            preuveFiles: [...(existing?.preuveFiles || []), ...uploadedFileUrls],
            correctionAddressed: isCorrectionStatus(existing?.status) ? true : existing?.correctionAddressed,
          } as Reponse,
        };
      });
      if (isCorrectionStatus(reponse.status)) {
        setTouchedCorrectionIds(prev => { const next = new Set(prev); next.add(critereId); return next; });
      }
      toast.success(filesToUpload.length > 1 ? t('evaluationFill.uploadedMultiple') : t('evaluationFill.uploadedSingle'));
    } catch (error) { toast.error(t('evaluationFill.uploadError')); }
  };

  const handleRemoveFile = async (critereId: string, fileUrl: string) => {
    if (!canEditCritere(critereId)) return;
    const reponse = reponses[critereId];
    if (!reponse?.id) return;
    try {
      await reponseService.deleteProof(reponse.id, fileUrl);
      setReponses(prev => {
        const existing = prev[critereId];
        if (!existing) return prev;
        return {
          ...prev,
          [critereId]: {
            ...existing,
            preuveFiles: (existing.preuveFiles || []).filter(f => f !== fileUrl),
            correctionAddressed: isCorrectionStatus(existing.status) ? true : existing.correctionAddressed,
          } as Reponse,
        };
      });
      if (isCorrectionStatus(reponse.status)) {
        setTouchedCorrectionIds(prev => { const next = new Set(prev); next.add(critereId); return next; });
      }
      toast.success(t('evaluationFill.removed'));
    } catch (error) { toast.error(t('evaluationFill.removeError')); }
  };

  const buildEditableReponsesPayload = () =>
    Object.values(reponses).filter(canEditReponse).map(r => ({
      critereId: r.critereId, niveau: r.niveau, commentaire: r.commentaire,
      preuveLinks: r.preuveLinks, correctionAddressed: Boolean(r.correctionAddressed) || touchedCorrectionIds.has(r.critereId),
    }));

  const saveEditableReponses = async () => {
    if (!id) return;
    const reponsesToSave = buildEditableReponsesPayload();
    if (reponsesToSave.length === 0) return;
    setSaveState('saving');
    const updatedReponses = await reponseService.saveBatch(id, reponsesToSave);
    const repMap: Record<string, Reponse> = {};
    updatedReponses.forEach(r => { repMap[r.critereId] = r; });
    setReponses(repMap);
    setTouchedCorrectionIds(new Set());
    setSaveState('saved');
  };

  const handleSubmit = () => {
    if (!id) return;
    const pendingCorrections = Object.values(reponses).filter(r =>
      isCorrectionStatus(r.status) && !isCorrectionAddressed(r));
    if (pendingCorrections.length > 0) {
      toast.error(t('evaluationFill.pendingCorrections', { count: pendingCorrections.length }));
      return;
    }
    setSubmitDialogOpen(true);
  };

  const confirmSubmit = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      await saveEditableReponses();
      await evaluationService.submit(id);
      toast.success(t('evaluationFill.submitted'));
      setSubmitDialogOpen(false);
      navigate('/user/dashboard');
    } catch (error) { toast.error(t('evaluationFill.submitError')); }
    finally { setIsSaving(false); }
  };

  const getProgress = () => {
    const total = Object.keys(reponses).length;
    if (total === 0) return 0;
    const answered = Object.values(reponses).filter(isReponseComplete).length;
    return Math.round((answered / total) * 100);
  };

  const rows = useMemo(() => {
    const active = principes.find(p => p.id === activePrincipe);
    if (!active) return [];
    const rows: { principe: Principe; bp: BonnePratique; critere: Critere }[] = [];
    active.bonnesPratiques.forEach(bp => {
      bp.criteres.forEach(critere => {
        rows.push({ principe: active, bp, critere });
      });
    });
    return rows;
  }, [activePrincipe, principes]);

  useEffect(() => {
    if (rows.length === 0) {
      setActiveCriterionId('');
      return;
    }
    if (!rows.some((row) => row.critere.id === activeCriterionId)) {
      setActiveCriterionId(rows[0].critere.id);
    }
  }, [activeCriterionId, rows]);

  if (isLoading || !evaluation) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div></div>;
  }

  const activeCriterionIndex = Math.max(0, rows.findIndex((row) => row.critere.id === activeCriterionId));
  const activeRow = rows[activeCriterionIndex];
  const totalCriteria = Object.keys(reponses).length;
  const completedCriteria = Object.values(reponses).filter(isReponseComplete).length;
  const incompleteCriteria = Math.max(0, totalCriteria - completedCriteria);

  const moveCriterion = (delta: number) => {
    const nextIndex = Math.min(rows.length - 1, Math.max(0, activeCriterionIndex + delta));
    const next = rows[nextIndex];
    if (next) setActiveCriterionId(next.critere.id);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await saveEditableReponses();
      setSaveState('saved');
      toast.success(t('evaluationFill.saved'));
    } catch (error) {
      setSaveState('error');
      toast.error(t('evaluationFill.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (activeRow) {
    const activeReponse = reponses[activeRow.critere.id];
    const canEdit = canEditReponse(activeReponse);
    const expectedEvidence = getLocalizedField(activeRow.critere, 'preuves', language);
    const references = getLocalizedField(activeRow.critere, 'references', language);
    const evidenceCount = (activeReponse?.preuveFiles?.length || 0) + (activeReponse?.preuveLinks?.length || 0);
    const saveLabel = saveState === 'saving'
      ? t('evaluationFill.saving')
      : saveState === 'saved'
        ? t('evaluationFill.savedState')
        : saveState === 'error'
          ? t('evaluationFill.saveFailed')
          : t('evaluationFill.draftReady');

    return (
      <div className="page-shell pb-24">
        <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 lg:flex-row lg:items-end lg:justify-between dark:border-slate-700">
          <div className="flex min-w-0 items-start gap-3">
            <button type="button" onClick={() => navigate('/user/dashboard')} className="icon-button flex-shrink-0" aria-label={t('common.back')}>
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </button>
            <div className="min-w-0">
              <p className="page-eyebrow">{t('evaluationFill.workspaceEyebrow')}</p>
              <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px] dark:text-slate-100">
                {evaluation.organismeName}
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                {t('common.year')} {evaluation.year} · {t(`evaluation.status.${evaluation.status}`)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleSaveAll} disabled={isSaving || !canEdit} className="btn-outline gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? t('evaluationFill.saving') : t('common.save')}
            </button>
            <button type="button" onClick={handleSubmit} disabled={isSaving || evaluation.status !== StatusEvaluation.EN_COURS} className="btn-success gap-2">
              <Send className="h-4 w-4" />
              {t('evaluationFill.reviewAndSubmit')}
            </button>
          </div>
        </header>

        <section className="card grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" aria-label={t('common.progress')}>
          <ProgressMeter
            value={getProgress()}
            label={t('evaluationFill.overallProgress')}
            detail={t('evaluationFill.completedCount', { completed: completedCriteria, total: totalCriteria })}
          />
          <div className="flex items-center gap-2" aria-live="polite">
            <span className={`h-2.5 w-2.5 rounded-full ${saveState === 'error' ? 'bg-red-500' : saveState === 'saving' ? 'bg-amber-500' : 'bg-green-500'}`} />
            <span className="text-xs font-medium text-gray-600 dark:text-slate-300">{saveLabel}</span>
          </div>
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
          <aside className="card overflow-hidden xl:sticky xl:top-24" aria-label={t('evaluationFill.principlesNavigation')}>
            <div className="border-b px-4 py-4 dark:border-slate-700">
              <p className="page-eyebrow">{t('evaluationFill.principles')}</p>
              <h2 className="mt-1 section-heading">{t('evaluationFill.choosePrinciple')}</h2>
            </div>
            <nav className="flex gap-2 overflow-x-auto p-3 xl:block xl:space-y-1 xl:overflow-visible">
              {principes.map((principe) => {
                const principleCriteria = principe.bonnesPratiques.flatMap((bp) => bp.criteres);
                const completed = principleCriteria.filter((critere) => isReponseComplete(reponses[critere.id])).length;
                const corrections = principleCriteria.filter((critere) => isCorrectionStatus(reponses[critere.id]?.status) && !isCorrectionAddressed(reponses[critere.id])).length;
                const selected = activePrincipe === principe.id;
                return (
                  <button
                    key={principe.id}
                    type="button"
                    onClick={() => setActivePrincipe(principe.id)}
                    className={`min-w-[210px] rounded-lg border px-3 py-3 text-start transition-colors xl:w-full ${selected ? 'border-primary-300 bg-primary-50 text-primary-900 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-100' : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                    aria-current={selected ? 'step' : undefined}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-primary-700 dark:text-primary-300">{t('evaluation.principe')} {principe.number}</span>
                      {completed === principleCriteria.length && principleCriteria.length > 0
                        ? <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
                        : <span className="text-[11px] tabular-nums text-gray-500">{completed}/{principleCriteria.length}</span>}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-sm font-semibold leading-5">{getLocalizedField(principe, 'name', language)}</span>
                    {corrections > 0 && <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{t('evaluationFill.correctionsCount', { count: corrections })}</span>}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 space-y-4">
            <nav className="card flex items-center gap-2 overflow-x-auto p-3" aria-label={t('evaluationFill.criteriaNavigation')}>
              {rows.map((row, index) => {
                const response = reponses[row.critere.id];
                const selected = row.critere.id === activeRow.critere.id;
                return (
                  <button
                    key={row.critere.id}
                    type="button"
                    onClick={() => setActiveCriterionId(row.critere.id)}
                    className={`inline-flex h-10 min-w-10 flex-shrink-0 items-center justify-center rounded-lg border px-2 text-xs font-bold transition-colors ${selected ? 'border-primary-700 bg-primary-700 text-white' : isReponseComplete(response) ? 'border-green-200 bg-green-50 text-green-700' : isCorrectionStatus(response?.status) ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:bg-[#132129]'}`}
                    aria-current={selected ? 'step' : undefined}
                    title={getLocalizedField(row.critere, 'label', language)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </nav>

            <article className="card overflow-hidden">
              <header className="border-b px-5 py-5 sm:px-6 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                    {t('evaluationFill.criterionPosition', { current: activeCriterionIndex + 1, total: rows.length })}
                  </span>
                  {isReponseComplete(activeReponse) && (
                    <span className="badge bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t('evaluationFill.complete')}
                    </span>
                  )}
                </div>
                <p className="mt-4 text-sm font-semibold text-primary-700 dark:text-primary-300">
                  {getLocalizedField(activeRow.bp, 'label', language)}
                </p>
                <h2 className="mt-2 text-xl font-bold leading-8 text-gray-900 dark:text-slate-100">
                  {getLocalizedField(activeRow.critere, 'label', language)}
                </h2>
              </header>

              {isCorrectionStatus(activeReponse?.status) && (
                <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 sm:px-6 dark:bg-amber-900/20 dark:text-amber-100">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold">{t('evaluationFill.correctionRequested')}</p>
                      <p className="mt-1 text-sm leading-6">{activeReponse.validatorComment || activeReponse.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-7 p-5 sm:p-6">
                <fieldset disabled={!canEdit}>
                  <legend className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t('evaluationFill.chooseLevel')}</legend>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t('evaluationFill.chooseLevelHint')}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                    {niveaux.map((niveau) => {
                      const selected = activeReponse?.niveau === niveau.key;
                      return (
                        <label key={niveau.key} className={`relative flex min-h-[96px] cursor-pointer flex-col justify-between rounded-xl border p-4 transition-colors ${selected ? `${niveau.color} ring-2 ring-current/10` : 'border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:bg-primary-50/50 dark:bg-[#132129] dark:text-slate-300'} ${!canEdit ? 'cursor-not-allowed opacity-70' : ''}`}>
                          <input
                            type="radio"
                            name={`niveau-${activeRow.critere.id}`}
                            value={niveau.key}
                            checked={selected}
                            onChange={() => handleNiveauChange(activeRow.critere.id, niveau.key)}
                            className="sr-only"
                          />
                          <span className="text-xs font-bold">{niveau.key}</span>
                          <span className="mt-3 text-sm font-semibold leading-5">{t(getNiveauTranslationKey(niveau.key))}</span>
                          {selected && <CheckCircle2 className="absolute end-3 top-3 h-4 w-4" aria-hidden="true" />}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <div>
                  <label htmlFor={`comment-${activeRow.critere.id}`} className="label">{t('evaluation.commentaire')}</label>
                  <p className="mb-2 text-xs text-gray-500 dark:text-slate-400">{t('evaluationFill.commentGuidance')}</p>
                  <textarea
                    id={`comment-${activeRow.critere.id}`}
                    value={activeReponse?.commentaire || ''}
                    onChange={(event) => handleCommentChange(activeRow.critere.id, event.target.value)}
                    onBlur={() => activeReponse && void saveReponseDraft(activeReponse)}
                    disabled={!canEdit}
                    placeholder={t('evaluationFill.commentairePlaceholder')}
                    rows={5}
                    className="input resize-y"
                  />
                </div>
              </div>

              <footer className="flex flex-col gap-3 border-t bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800/40">
                <button type="button" onClick={() => moveCriterion(-1)} disabled={activeCriterionIndex === 0} className="btn-outline gap-2">
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t('common.previous')}
                </button>
                <span className="text-center text-xs font-medium text-gray-500" aria-live="polite">{saveLabel}</span>
                <button type="button" onClick={() => moveCriterion(1)} disabled={activeCriterionIndex >= rows.length - 1} className="btn-primary gap-2">
                  {t('common.next')} <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              </footer>
            </article>
          </main>

          <aside className="space-y-4 xl:sticky xl:top-24">
            <section className="card overflow-hidden" aria-labelledby="evidence-context-title">
              <header className="border-b px-4 py-4 dark:border-slate-700">
                <p className="page-eyebrow">{t('evaluationFill.context')}</p>
                <h2 id="evidence-context-title" className="mt-1 section-heading">{t('evaluationFill.evidenceAndReferences')}</h2>
              </header>
              <div className="space-y-5 p-4">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100"><BookOpenCheck className="h-4 w-4 text-primary-700" />{t('evaluationFill.preuvesAttendues')}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-slate-300">{expectedEvidence || t('evaluationFill.notSpecified')}</p>
                </div>
                <div className="border-t pt-5 dark:border-slate-700">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-slate-100"><FileText className="h-4 w-4 text-secondary-600" />{t('evaluationFill.references')}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600 dark:text-slate-300">{references || t('evaluationFill.notSpecified')}</p>
                </div>
              </div>
            </section>

            <section className="card overflow-hidden" aria-labelledby="attached-evidence-title">
              <header className="flex items-center justify-between border-b px-4 py-4 dark:border-slate-700">
                <div>
                  <p className="page-eyebrow">{t('evaluation.preuves')}</p>
                  <h2 id="attached-evidence-title" className="mt-1 section-heading">{t('evaluationFill.attachedEvidence')}</h2>
                </div>
                <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300">{evidenceCount}</span>
              </header>
              <div className="space-y-3 p-4">
                {canEdit && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="btn-outline cursor-pointer gap-2 px-2 text-xs">
                      <Upload className="h-4 w-4" /> {t('evaluationFill.attachFile')}
                      <input type="file" multiple className="sr-only" onChange={(event) => { void handleFileUpload(activeRow.critere.id, event.target.files || undefined); event.target.value = ''; }} />
                    </label>
                    <button type="button" onClick={() => handleAddLink(activeRow.critere.id)} className="btn-outline gap-2 px-2 text-xs">
                      <Link className="h-4 w-4" /> {t('evaluationFill.addLink')}
                    </button>
                  </div>
                )}

                {evidenceCount === 0 && (
                  <div className="rounded-xl border border-dashed bg-gray-50 p-5 text-center dark:bg-slate-800/40">
                    <Paperclip className="mx-auto h-6 w-6 text-gray-400" />
                    <p className="mt-2 text-xs leading-5 text-gray-500">{t('evaluationFill.noEvidence')}</p>
                  </div>
                )}

                {activeReponse?.preuveFiles?.map((fileUrl) => (
                  <div key={fileUrl} className="flex items-center gap-2 rounded-lg border bg-gray-50 p-2.5 dark:bg-slate-800/40">
                    <button type="button" onClick={() => fileService.download(fileUrl)} className="min-w-0 flex-1 truncate text-start text-xs font-semibold text-primary-700 hover:underline">{fileUrl.split('/').pop()}</button>
                    {canEdit && <button type="button" onClick={() => void handleRemoveFile(activeRow.critere.id, fileUrl)} className="icon-button h-8 w-8 border-0 bg-transparent text-red-500 shadow-none" aria-label={t('common.delete')}><X className="h-3.5 w-3.5" /></button>}
                  </div>
                ))}

                {activeReponse?.preuveLinks?.map((proofLink) => (
                  <div key={proofLink} className="flex items-center gap-2 rounded-lg border bg-gray-50 p-2.5 dark:bg-slate-800/40">
                    <a href={proofLink} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2 truncate text-xs font-semibold text-primary-700 hover:underline">
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">{proofLink}</span>
                    </a>
                    {canEdit && <button type="button" onClick={() => handleRemoveLink(activeRow.critere.id, proofLink)} className="icon-button h-8 w-8 border-0 bg-transparent text-red-500 shadow-none" aria-label={t('common.delete')}><X className="h-3.5 w-3.5" /></button>}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="sticky bottom-4 z-20 rounded-xl border bg-white/95 p-3 shadow-xl backdrop-blur xl:hidden dark:bg-[#132129]/95">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => moveCriterion(-1)} disabled={activeCriterionIndex === 0} className="icon-button"><ChevronLeft className="h-5 w-5 rtl:rotate-180" /></button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">{t('evaluationFill.criterionPosition', { current: activeCriterionIndex + 1, total: rows.length })}</p>
              <p className="mt-0.5 text-[11px] text-gray-500">{saveLabel}</p>
            </div>
            <button type="button" onClick={() => moveCriterion(1)} disabled={activeCriterionIndex >= rows.length - 1} className="icon-button bg-primary-700 text-white hover:bg-primary-800 hover:text-white"><ChevronRight className="h-5 w-5 rtl:rotate-180" /></button>
          </div>
        </div>

        <ConfirmDialog
          open={submitDialogOpen}
          title={t('evaluation.submitConfirm')}
          description={`${t('evaluationFill.submitReview', { count: incompleteCriteria })}\n${t('evaluation.submitWarning')}`}
          confirmLabel={t('evaluationFill.submit')}
          cancelLabel={t('common.cancel')}
          busy={isSaving}
          onConfirm={() => void confirmSubmit()}
          onClose={() => setSubmitDialogOpen(false)}
        />

        {linkDialogCritereId && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <section role="dialog" aria-modal="true" aria-labelledby="proof-link-title" className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl dark:bg-[#132129]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="page-eyebrow">{t('evaluation.preuves')}</p>
                  <h2 id="proof-link-title" className="mt-1 text-lg font-semibold text-gray-900 dark:text-slate-100">{t('evaluationFill.addLink')}</h2>
                </div>
                <button type="button" onClick={() => setLinkDialogCritereId(null)} className="icon-button h-9 w-9 border-0 shadow-none" aria-label={t('common.close')}><X className="h-4 w-4" /></button>
              </div>
              <label htmlFor="proof-link-input" className="label mt-5">URL</label>
              <input id="proof-link-input" type="url" value={linkInput} onChange={(event) => setLinkInput(event.target.value)} className="input" placeholder="https://" autoFocus />
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={() => setLinkDialogCritereId(null)} className="btn-outline">{t('common.cancel')}</button>
                <button type="button" onClick={confirmAddLink} disabled={!linkInput.trim()} className="btn-primary">{t('common.confirm')}</button>
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/user/dashboard')} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{evaluation.organismeName} - {evaluation.year}</h1>
            <div className="flex items-center gap-2">
              <div className="w-40 h-2 bg-gray-200 rounded-full"><div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${getProgress()}%` }} /></div>
              <span className="text-sm font-medium text-gray-600">{getProgress()}%</span>
            </div>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={isSaving || evaluation.status !== StatusEvaluation.EN_COURS} className="btn-success gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <Send className="w-4 h-4" /> {t('evaluationFill.submit')}
        </button>
      </div>

      {/* Principle tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {principes.map((p) => {
          const principeReponses = p.bonnesPratiques.flatMap(bp => bp.criteres.map(c => reponses[c.id])).filter(Boolean);
          const completed = principeReponses.filter(isReponseComplete).length;
          const total = principeReponses.length;
          const isComplete = total > 0 && completed === total;
          return (
            <button key={p.id} onClick={() => setActivePrincipe(p.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activePrincipe === p.id ? 'bg-primary-700 text-white' : isComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              <span className="me-1">{p.number}.</span>{getLocalizedField(p, 'name', language)}
              <span className="ms-1 opacity-70">({completed}/{total})</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="w-10 px-3 py-2.5 text-start font-semibold text-gray-700">N°</th>
              <th className="px-3 py-2.5 text-start font-semibold text-gray-700">BP</th>
              <th className="px-3 py-2.5 text-start font-semibold text-gray-700">Critère</th>
              {niveaux.map((niveau) => (
                <th key={niveau.key} className="min-w-[112px] px-3 py-2.5 text-center font-semibold text-gray-700">
                  {t(niveau.label)}
                </th>
              ))}
              <th className="min-w-[160px] px-3 py-2.5 text-start font-semibold text-gray-700">Preuves & Commentaire</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(() => {
              const groups: { bp: BonnePratique; criteres: { critere: Critere; idx: number }[] }[] = [];
              rows.forEach((row, idx) => {
                const bpKey = row.bp.id || getLocalizedField(row.bp, 'label', language);
                let group = groups.find(g => g.bp.id === bpKey);
                if (!group) { group = { bp: row.bp, criteres: [] }; groups.push(group); }
                group.criteres.push({ critere: row.critere, idx });
              });

              return groups.flatMap((group, gi) =>
                group.criteres.map((item, ci) => {
                  const reponse = reponses[item.critere.id];
                  const canEdit = canEditReponse(reponse);
                  const preuvesAttendues = getLocalizedField(item.critere, 'preuves', language);
                  const references = getLocalizedField(item.critere, 'references', language);
                  const isFirstInGroup = ci === 0;

                  return (
                    <tr key={item.critere.id} className={`hover:bg-gray-50 ${isCorrectionStatus(reponse?.status) ? 'bg-amber-50/50' : ''}`}>
                      {isFirstInGroup ? (
                        <td className="px-3 py-2 text-gray-500 align-top align-middle" rowSpan={group.criteres.length}>{gi + 1}</td>
                      ) : null}
                      {isFirstInGroup ? (
                        <td className="px-3 py-2 text-gray-700 align-top text-xs align-middle" rowSpan={group.criteres.length}>{getLocalizedField(group.bp, 'label', language)}</td>
                      ) : null}
                      <td className="px-3 py-2 text-gray-900 align-top">
                        <span className="font-medium">{ci + 1}.</span> {getLocalizedField(item.critere, 'label', language)}
                        {isCorrectionStatus(reponse?.status) && (
                          <div className="mt-1 flex items-start gap-1 rounded border border-amber-200 bg-amber-50 p-2 text-xs font-medium text-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{reponse?.validatorComment || reponse?.rejectionReason || t('evaluationFill.correctionRequested')}</span>
                          </div>
                        )}
                      </td>
                      {niveaux.map((n) => (
                        <td key={n.key} className="px-1 py-2 text-center align-top">
                          <div className="flex items-center justify-center min-h-[28px]">
                            <input
                              type="radio"
                              name={`niveau-${item.critere.id}`}
                              checked={reponse?.niveau === n.key}
                              onChange={() => handleNiveauChange(item.critere.id, n.key)}
                              disabled={!canEdit}
                              aria-label={getNiveauTranslationKey(n.key) ? t(getNiveauTranslationKey(n.key)) : undefined}
                              title={t(getNiveauTranslationKey(n.key))}
                              className="w-4 h-4 text-primary-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-2 align-top">
                        {canEdit ? (
                          <textarea
                            value={reponse?.commentaire || ''}
                            onChange={(event) => handleCommentChange(item.critere.id, event.target.value)}
                            onBlur={() => {
                              const current = reponses[item.critere.id];
                              if (current) void saveReponseDraft(current);
                            }}
                            placeholder={t('evaluationFill.commentairePlaceholder')}
                            rows={2}
                            className="input w-full resize-y px-2 py-1.5 text-xs"
                          />
                        ) : reponse?.commentaire ? (
                          <p className="mb-1 text-xs text-gray-600">{reponse.commentaire}</p>
                        ) : null}
                        {preuvesAttendues && (
                          <div className="mt-1 rounded bg-blue-50 border border-blue-100 p-1.5 text-xs text-blue-800">
                            <div className="flex items-center gap-1 font-semibold"><FileText className="w-3 h-3" /> {t('evaluationFill.preuvesAttendues')}</div>
                            <p className="mt-0.5">{preuvesAttendues}</p>
                          </div>
                        )}
                        {references && (
                          <div className="mt-1 rounded bg-gray-50 border border-gray-200 p-1.5 text-xs text-gray-600">
                            <span className="font-semibold">{t('evaluationFill.references')}:</span> {references}
                          </div>
                        )}
                        {canEdit && (
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <label className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700 cursor-pointer">
                              <Upload className="w-3 h-3" /> {t('evaluationFill.attachFile')}
                              <input type="file" multiple className="hidden" onChange={(e) => { handleFileUpload(item.critere.id, e.target.files || undefined); e.target.value = ''; }} />
                            </label>
                            <button type="button" onClick={() => handleAddLink(item.critere.id)} className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700">
                              <Link className="w-3 h-3" /> {t('evaluationFill.addLink')}
                            </button>
                          </div>
                        )}
                        {(reponse?.preuveFiles?.length || 0) > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {reponse?.preuveFiles?.map((fileUrl) => (
                              <div key={fileUrl} className="flex items-center gap-1 rounded bg-gray-50 px-1.5 py-0.5 text-xs">
                                <button type="button" onClick={() => fileService.download(fileUrl)} className="flex-1 truncate text-start text-primary-700 hover:underline">{fileUrl.split('/').pop()}</button>
                                {canEdit && <button type="button" onClick={() => handleRemoveFile(item.critere.id, fileUrl)} className="text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>}
                              </div>
                            ))}
                          </div>
                        )}
                        {(reponse?.preuveLinks?.length || 0) > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {reponse?.preuveLinks?.map((link) => (
                              <div key={link} className="flex items-center gap-1 rounded bg-gray-50 px-1.5 py-0.5 text-xs">
                                <a href={link} target="_blank" rel="noreferrer" className="flex-1 truncate text-primary-700 hover:underline">{link}</a>
                                {canEdit && <button type="button" onClick={() => handleRemoveLink(item.critere.id, link)} className="text-red-500 hover:text-red-700"><X className="w-3 h-3" /></button>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
