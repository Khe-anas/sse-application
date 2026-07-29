import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronLeft,
  ExternalLink,
  FileText,
  Link,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import api from '@/services/api';
import { evaluationService, reponseService } from '@/services/evaluationService';
import { fileService } from '@/services/fileService';
import { Niveau, StatusEvaluation, StatusReponse } from '@/types';
import type { Evaluation, Principe, Reponse } from '@/types';
import { getLocalizedField } from '@/utils/localization';
import { getNiveauTranslationKey } from '@/utils/niveau';

const niveaux = [
  { key: Niveau.N0, labelKey: getNiveauTranslationKey(Niveau.N0) },
  { key: Niveau.N1, labelKey: getNiveauTranslationKey(Niveau.N1) },
  { key: Niveau.N2, labelKey: getNiveauTranslationKey(Niveau.N2) },
  { key: Niveau.N3, labelKey: getNiveauTranslationKey(Niveau.N3) },
];

export default function EvaluationFillPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [principes, setPrincipes] = useState<Principe[]>([]);
  const [reponses, setReponses] = useState<Record<string, Reponse>>({});
  const [activePrincipeId, setActivePrincipeId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [touchedCorrectionIds, setTouchedCorrectionIds] = useState<Set<string>>(new Set());
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [linkDialogCritereId, setLinkDialogCritereId] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState('');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [evaluationData, principeData, reponseData] = await Promise.all([
        evaluationService.getById(id),
        api.get<Principe[]>('/principes').then((response) => response.data),
        reponseService.getByEvaluation(id),
      ]);

      const reponseMap: Record<string, Reponse> = {};
      reponseData.forEach((reponse) => {
        reponseMap[reponse.critereId] = reponse;
      });

      setEvaluation(evaluationData);
      setPrincipes(principeData);
      setReponses(reponseMap);
      setTouchedCorrectionIds(new Set());
      setActivePrincipeId(principeData[0]?.id || '');
    } catch {
      toast.error(t('evaluationFill.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activePrincipe = useMemo(
    () => principes.find((principe) => principe.id === activePrincipeId),
    [activePrincipeId, principes],
  );

  const isCorrectionStatus = (status: StatusReponse | undefined) =>
    status === StatusReponse.A_CORRIGER || status === StatusReponse.REJETEE;

  const canEditReponse = (reponse: Reponse | undefined) =>
    evaluation?.status === StatusEvaluation.EN_COURS
    && Boolean(reponse)
    && (reponse?.status === StatusReponse.BROUILLON || isCorrectionStatus(reponse?.status));

  const isCorrectionAddressed = (reponse: Reponse | undefined) =>
    Boolean(reponse && (
      !isCorrectionStatus(reponse.status)
      || Boolean(reponse.correctionAddressed)
      || touchedCorrectionIds.has(reponse.critereId)
    ));

  const isReponseComplete = (reponse: Reponse | undefined) =>
    Boolean(reponse) && reponse?.niveau != null && isCorrectionAddressed(reponse);

  const totalCriteria = Object.keys(reponses).length;
  const completedCriteria = Object.values(reponses).filter(isReponseComplete).length;
  const incompleteCriteria = Math.max(0, totalCriteria - completedCriteria);
  const progress = totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0;

  const saveReponseDraft = async (reponse: Reponse) => {
    if (!id) return;
    setSaveState('saving');
    try {
      const saved = await reponseService.saveBatch(id, [{
        critereId: reponse.critereId,
        niveau: reponse.niveau,
        commentaire: reponse.commentaire,
        preuveLinks: reponse.preuveLinks,
        correctionAddressed: Boolean(reponse.correctionAddressed)
          || touchedCorrectionIds.has(reponse.critereId),
      }]);
      const updated = saved.find((item) => item.critereId === reponse.critereId);
      if (updated) {
        setReponses((current) => ({ ...current, [updated.critereId]: updated }));
      }
      setSaveState('saved');
    } catch {
      setSaveState('error');
      toast.error(t('evaluationFill.saveError'));
    }
  };

  const handleNiveauChange = (critereId: string, niveau: Niveau) => {
    const existing = reponses[critereId];
    if (!canEditReponse(existing)) return;

    const isCorrection = isCorrectionStatus(existing.status);
    const updated: Reponse = {
      ...existing,
      niveau,
      correctionAddressed: isCorrection ? true : existing.correctionAddressed,
    };

    setReponses((current) => ({ ...current, [critereId]: updated }));
    if (isCorrection) {
      setTouchedCorrectionIds((current) => new Set(current).add(critereId));
    }
    void saveReponseDraft(updated);
  };

  const handleAddLink = (critereId: string) => {
    if (!canEditReponse(reponses[critereId])) return;
    setLinkInput('');
    setLinkDialogCritereId(critereId);
  };

  const confirmAddLink = () => {
    if (!linkDialogCritereId) return;
    const trimmedLink = linkInput.trim();
    if (!trimmedLink) return;

    const existing = reponses[linkDialogCritereId];
    if (!canEditReponse(existing)) return;
    const isCorrection = isCorrectionStatus(existing.status);
    const updated: Reponse = {
      ...existing,
      preuveLinks: [...(existing.preuveLinks || []), trimmedLink],
      correctionAddressed: isCorrection ? true : existing.correctionAddressed,
    };

    setReponses((current) => ({ ...current, [linkDialogCritereId]: updated }));
    if (isCorrection) {
      setTouchedCorrectionIds((current) => new Set(current).add(linkDialogCritereId));
    }
    void saveReponseDraft(updated);
    setLinkDialogCritereId(null);
    setLinkInput('');
  };

  const handleRemoveLink = (critereId: string, linkToRemove: string) => {
    const existing = reponses[critereId];
    if (!canEditReponse(existing)) return;

    const isCorrection = isCorrectionStatus(existing.status);
    const updated: Reponse = {
      ...existing,
      preuveLinks: (existing.preuveLinks || []).filter((link) => link !== linkToRemove),
      correctionAddressed: isCorrection ? true : existing.correctionAddressed,
    };

    setReponses((current) => ({ ...current, [critereId]: updated }));
    if (isCorrection) {
      setTouchedCorrectionIds((current) => new Set(current).add(critereId));
    }
    void saveReponseDraft(updated);
  };

  const handleFileUpload = async (critereId: string, files?: FileList | File[]) => {
    const existing = reponses[critereId];
    if (!canEditReponse(existing)) return;
    const filesToUpload = Array.from(files || []);
    if (filesToUpload.length === 0) return;
    if (!existing.id) {
      toast.error(t('evaluationFill.notFound'));
      return;
    }

    try {
      const uploadedFiles: string[] = [];
      for (const file of filesToUpload) {
        uploadedFiles.push(await reponseService.uploadProof(existing.id, file));
      }
      setReponses((current) => ({
        ...current,
        [critereId]: {
          ...current[critereId],
          preuveFiles: [...(current[critereId]?.preuveFiles || []), ...uploadedFiles],
          correctionAddressed: isCorrectionStatus(current[critereId]?.status)
            ? true
            : current[critereId]?.correctionAddressed,
        } as Reponse,
      }));
      if (isCorrectionStatus(existing.status)) {
        setTouchedCorrectionIds((current) => new Set(current).add(critereId));
      }
      toast.success(
        filesToUpload.length > 1
          ? t('evaluationFill.uploadedMultiple')
          : t('evaluationFill.uploadedSingle'),
      );
    } catch {
      toast.error(t('evaluationFill.uploadError'));
    }
  };

  const handleRemoveFile = async (critereId: string, fileUrl: string) => {
    const existing = reponses[critereId];
    if (!canEditReponse(existing) || !existing.id) return;

    try {
      await reponseService.deleteProof(existing.id, fileUrl);
      setReponses((current) => ({
        ...current,
        [critereId]: {
          ...current[critereId],
          preuveFiles: (current[critereId]?.preuveFiles || []).filter((file) => file !== fileUrl),
          correctionAddressed: isCorrectionStatus(current[critereId]?.status)
            ? true
            : current[critereId]?.correctionAddressed,
        } as Reponse,
      }));
      if (isCorrectionStatus(existing.status)) {
        setTouchedCorrectionIds((current) => new Set(current).add(critereId));
      }
      toast.success(t('evaluationFill.removed'));
    } catch {
      toast.error(t('evaluationFill.removeError'));
    }
  };

  const saveEditableReponses = async () => {
    if (!id) return;
    const editableReponses = Object.values(reponses)
      .filter(canEditReponse)
      .map((reponse) => ({
        critereId: reponse.critereId,
        niveau: reponse.niveau,
        commentaire: reponse.commentaire,
        preuveLinks: reponse.preuveLinks,
        correctionAddressed: Boolean(reponse.correctionAddressed)
          || touchedCorrectionIds.has(reponse.critereId),
      }));
    if (editableReponses.length === 0) return;

    const saved = await reponseService.saveBatch(id, editableReponses);
    setReponses((current) => {
      const next = { ...current };
      saved.forEach((reponse) => {
        next[reponse.critereId] = reponse;
      });
      return next;
    });
    setTouchedCorrectionIds(new Set());
  };

  const handleSubmit = () => {
    const pendingCorrections = Object.values(reponses).filter(
      (reponse) => isCorrectionStatus(reponse.status) && !isCorrectionAddressed(reponse),
    );
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
    } catch {
      toast.error(t('evaluationFill.submitError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !evaluation) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-700" />
      </div>
    );
  }

  const saveLabel = saveState === 'saving'
    ? t('evaluationFill.saving')
    : saveState === 'saved'
      ? t('evaluationFill.savedState')
      : saveState === 'error'
        ? t('evaluationFill.saveFailed')
        : t('evaluationFill.draftReady');

  return (
    <div className="page-shell space-y-5 pb-10">
      <header className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/user/dashboard')}
            className="icon-button flex-shrink-0"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-gray-900 dark:text-slate-100">
              {evaluation.organismeName}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              {t('common.year')} {evaluation.year} · {t(`evaluation.status.${evaluation.status}`)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || evaluation.status !== StatusEvaluation.EN_COURS}
          className="btn-success gap-2"
        >
          <Send className="h-4 w-4" />
          {t('evaluationFill.submit')}
        </button>
      </header>

      <section className="card p-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-gray-700 dark:text-slate-200">
            {t('evaluationFill.completedCount', { completed: completedCriteria, total: totalCriteria })}
          </span>
          <span className="font-bold text-primary-700 dark:text-primary-300">{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-primary-700 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="card overflow-hidden xl:sticky xl:top-24">
          <div className="border-b border-gray-200 px-4 py-4 dark:border-slate-700">
            <p className="page-eyebrow">{t('evaluationFill.principles')}</p>
            <h2 className="mt-1 section-heading">{t('evaluationFill.choosePrinciple')}</h2>
          </div>
          <nav
            className="flex gap-2 overflow-x-auto p-3 xl:block xl:space-y-2 xl:overflow-visible"
            aria-label={t('evaluationFill.principlesNavigation')}
          >
            {principes.map((principe) => {
              const principeCriteres = principe.bonnesPratiques.flatMap((bp) => bp.criteres);
              const completed = principeCriteres.filter(
                (critere) => isReponseComplete(reponses[critere.id]),
              ).length;
              const selected = principe.id === activePrincipeId;
              return (
                <button
                  key={principe.id}
                  type="button"
                  onClick={() => setActivePrincipeId(principe.id)}
                  className={`min-w-[220px] rounded-lg border px-3 py-3 text-start transition-colors xl:w-full xl:min-w-0 ${
                    selected
                      ? 'border-primary-300 bg-primary-50 text-primary-900 dark:border-primary-700 dark:bg-primary-900/30 dark:text-primary-100'
                      : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                  aria-current={selected ? 'step' : undefined}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary-700 dark:text-primary-300">
                      {t('evaluation.principe')} {principe.number}
                    </span>
                    <span className="text-[11px] tabular-nums text-gray-500 dark:text-slate-400">
                      {completed}/{principeCriteres.length}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm font-semibold leading-5">
                    {getLocalizedField(principe, 'name', language)}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 space-y-5">
          <div className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
            <p className="font-medium">{t('evaluationFill.chooseLevelHint')}</p>
            <span
              className={`flex-shrink-0 text-xs font-semibold ${
                saveState === 'error'
                  ? 'text-red-600'
                  : saveState === 'saving'
                    ? 'text-amber-600'
                    : 'text-blue-700 dark:text-blue-200'
              }`}
              aria-live="polite"
            >
              {saveLabel}
            </span>
          </div>

          {activePrincipe?.bonnesPratiques.map((bonnePratique) => {
            const completed = bonnePratique.criteres.filter(
              (critere) => isReponseComplete(reponses[critere.id]),
            ).length;

            return (
              <section
                key={bonnePratique.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#132129]"
              >
                <header className="border-b border-primary-200 bg-primary-50 px-5 py-4 dark:border-primary-800 dark:bg-primary-900/20">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">
                        {t('validation.goodPractice')} {bonnePratique.number}
                      </p>
                      <h2 className="mt-1 text-base font-bold leading-6 text-gray-900 dark:text-slate-100">
                        {getLocalizedField(bonnePratique, 'label', language)}
                      </h2>
                    </div>
                    <span className="badge flex-shrink-0 bg-white text-primary-700 dark:bg-slate-800 dark:text-primary-200">
                      {completed}/{bonnePratique.criteres.length}
                    </span>
                  </div>
                </header>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] table-fixed text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
                        <th
                          scope="col"
                          className="w-[42%] px-5 py-4 text-start text-sm font-bold text-gray-800 dark:text-slate-100"
                        >
                          {t('evaluation.critere')}
                        </th>
                        {niveaux.map((niveau) => (
                          <th
                            key={niveau.key}
                            scope="col"
                            className="w-[14.5%] px-2 py-4 text-center text-sm font-bold leading-5 text-gray-800 dark:text-slate-100"
                          >
                            {t(niveau.labelKey)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {bonnePratique.criteres.map((critere, critereIndex) => {
                        const reponse = reponses[critere.id];
                        const canEdit = canEditReponse(reponse);
                        const expectedEvidence = getLocalizedField(critere, 'preuves', language);
                        const references = getLocalizedField(critere, 'references', language);
                        const correctionReason = reponse?.validatorComment || reponse?.rejectionReason;

                        return (
                          <tr
                            key={critere.id}
                            className={isCorrectionStatus(reponse?.status) ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}
                          >
                            <th
                              scope="row"
                              className="px-5 py-5 text-start align-top font-normal"
                            >
                              <div className="flex items-start gap-3">
                                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-primary-100 px-2 text-xs font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                                  {critereIndex + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-semibold leading-6 text-gray-900 dark:text-slate-100">
                                    {getLocalizedField(critere, 'label', language)}
                                  </p>

                                  {isCorrectionStatus(reponse?.status) && (
                                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
                                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                      <div>
                                        <p className="font-bold">{t('evaluationFill.correctionRequested')}</p>
                                        {correctionReason && <p className="mt-1 leading-5">{correctionReason}</p>}
                                      </div>
                                    </div>
                                  )}

                                  {expectedEvidence && (
                                    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
                                      <p className="font-bold">{t('evaluationFill.preuvesAttendues')}</p>
                                      <p className="mt-1 whitespace-pre-wrap leading-5">{expectedEvidence}</p>
                                    </div>
                                  )}

                                  {references && (
                                    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                                      <p className="font-bold">{t('evaluationFill.references')}</p>
                                      <p className="mt-1 whitespace-pre-wrap leading-5">{references}</p>
                                    </div>
                                  )}

                                  <div className="mt-3 border-t border-gray-200 pt-3 dark:border-slate-700">
                                    <p className="text-xs font-bold text-gray-700 dark:text-slate-200">
                                      {t('evaluation.preuves')}
                                    </p>

                                    {canEdit && (
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <label className="btn-outline btn-sm cursor-pointer justify-center gap-1.5 text-xs">
                                          <Upload className="h-3.5 w-3.5" />
                                          {t('evaluationFill.attachFile')}
                                          <input
                                            type="file"
                                            multiple
                                            className="sr-only"
                                            onChange={(event) => {
                                              void handleFileUpload(critere.id, event.target.files || undefined);
                                              event.target.value = '';
                                            }}
                                          />
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => handleAddLink(critere.id)}
                                          className="btn-outline btn-sm justify-center gap-1.5 text-xs"
                                        >
                                          <Link className="h-3.5 w-3.5" />
                                          {t('evaluationFill.addLink')}
                                        </button>
                                      </div>
                                    )}

                                    {(reponse?.preuveFiles?.length || 0) === 0
                                      && (reponse?.preuveLinks?.length || 0) === 0 && (
                                      <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-slate-400">
                                        {t('evaluationFill.noEvidence')}
                                      </p>
                                    )}

                                    <div className="mt-3 space-y-2">
                                      {reponse?.preuveFiles?.map((fileUrl) => (
                                        <div key={fileUrl} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-slate-800/50">
                                          <FileText className="h-3.5 w-3.5 flex-shrink-0 text-primary-700" />
                                          <button
                                            type="button"
                                            onClick={() => fileService.download(fileUrl)}
                                            className="min-w-0 flex-1 truncate text-start text-xs font-medium text-primary-700 hover:underline"
                                          >
                                            {fileUrl.split('/').pop()}
                                          </button>
                                          {canEdit && (
                                            <button
                                              type="button"
                                              onClick={() => void handleRemoveFile(critere.id, fileUrl)}
                                              className="text-red-500 hover:text-red-700"
                                              aria-label={t('common.delete')}
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      {reponse?.preuveLinks?.map((proofLink) => (
                                        <div key={proofLink} className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-slate-800/50">
                                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-primary-700" />
                                          <a
                                            href={proofLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="min-w-0 flex-1 truncate text-xs font-medium text-primary-700 hover:underline"
                                          >
                                            {proofLink}
                                          </a>
                                          {canEdit && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveLink(critere.id, proofLink)}
                                              className="text-red-500 hover:text-red-700"
                                              aria-label={t('common.delete')}
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </th>

                            {niveaux.map((niveau) => {
                              const selected = reponse?.niveau === niveau.key;
                              const levelLabel = t(niveau.labelKey);
                              return (
                                <td key={niveau.key} className="px-2 py-5 text-center align-top">
                                  <label
                                    className={`inline-flex min-h-[76px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border px-1.5 py-2 transition-colors ${
                                      selected
                                        ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-100 dark:bg-primary-900/30 dark:ring-primary-900'
                                        : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50/50 dark:border-slate-700 dark:bg-[#132129]'
                                    } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
                                    title={levelLabel}
                                  >
                                    <span className="text-center text-[11px] font-bold leading-4 text-gray-700 dark:text-slate-200">
                                      {levelLabel}
                                    </span>
                                    <input
                                      type="radio"
                                      name={`niveau-${critere.id}`}
                                      checked={selected}
                                      onChange={() => handleNiveauChange(critere.id, niveau.key)}
                                      disabled={!canEdit}
                                      aria-label={`${getLocalizedField(critere, 'label', language)} — ${levelLabel}`}
                                      className="h-5 w-5 accent-primary-700"
                                    />
                                  </label>
                                </td>
                              );
                            })}

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          {!activePrincipe && (
            <div className="card p-10 text-center text-sm text-gray-500">
              {t('evaluationFill.noEditableResponses')}
            </div>
          )}
        </main>
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
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="proof-link-title"
            className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl dark:bg-[#132129]"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="proof-link-title" className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                {t('evaluationFill.addLink')}
              </h2>
              <button
                type="button"
                onClick={() => setLinkDialogCritereId(null)}
                className="icon-button h-9 w-9 border-0 shadow-none"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label htmlFor="proof-link-input" className="label mt-5">URL</label>
            <input
              id="proof-link-input"
              type="url"
              value={linkInput}
              onChange={(event) => setLinkInput(event.target.value)}
              className="input"
              placeholder="https://"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setLinkDialogCritereId(null)} className="btn-outline">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmAddLink}
                disabled={!linkInput.trim()}
                className="btn-primary"
              >
                {t('common.confirm')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
