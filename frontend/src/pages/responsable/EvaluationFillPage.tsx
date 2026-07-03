import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Send, Upload, Link, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { evaluationService, reponseService } from '@/services/evaluationService';
import { fileService } from '@/services/fileService';
import { Niveau, StatusEvaluation, StatusReponse } from '@/types';
import type { Evaluation, Reponse, Principe } from '@/types';
import api from '@/services/api';
import { getLocalizedField } from '@/utils/localization';

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
  const commentSaveTimers = useRef<Record<string, number>>({});

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

  useEffect(() => {
    return () => {
      Object.values(commentSaveTimers.current).forEach(window.clearTimeout);
    };
  }, []);

  const canEditReponse = (reponse: Reponse | undefined) =>
    evaluation?.status === StatusEvaluation.EN_COURS
    && !!reponse
    && (reponse.status === StatusReponse.BROUILLON || reponse.status === StatusReponse.A_CORRIGER);

  const canEditCritere = (critereId: string) => canEditReponse(reponses[critereId]);

  const markCorrectionAddressed = (critereId: string) => {
    const reponse = reponses[critereId];
    if (reponse?.status !== StatusReponse.A_CORRIGER) return;

    setTouchedCorrectionIds(prev => {
      const next = new Set(prev);
      next.add(critereId);
      return next;
    });
  };

  const isCorrectionAddressed = (reponse: Reponse | undefined) =>
    !!reponse
    && (
      reponse.status !== StatusReponse.A_CORRIGER
      || Boolean(reponse.correctionAddressed)
      || touchedCorrectionIds.has(reponse.critereId)
    );

  const isReponseComplete = (reponse: Reponse | undefined) =>
    !!reponse && reponse.niveau != null && isCorrectionAddressed(reponse);

  const saveReponseDraft = async (reponse: Reponse) => {
    if (!id) return;

    try {
      const updatedReponses = await reponseService.saveBatch(id, [{
        critereId: reponse.critereId,
        niveau: reponse.niveau,
        commentaire: reponse.commentaire,
        preuveLinks: reponse.preuveLinks,
        correctionAddressed: Boolean(reponse.correctionAddressed) || touchedCorrectionIds.has(reponse.critereId),
      }]);
      const updated = updatedReponses.find((item) => item.critereId === reponse.critereId);
      if (updated) {
        setReponses(prev => ({ ...prev, [updated.critereId]: updated }));
      }
    } catch (error) {
      toast.error(t('evaluationFill.saveError'));
    }
  };

  const scheduleReponseDraftSave = (reponse: Reponse) => {
    window.clearTimeout(commentSaveTimers.current[reponse.critereId]);
    commentSaveTimers.current[reponse.critereId] = window.setTimeout(() => {
      void saveReponseDraft(reponse);
    }, 600);
  };

  const handleNiveauChange = (critereId: string, niveau: Niveau) => {
    if (!canEditCritere(critereId)) return;

    const existing = reponses[critereId];
    const updated = {
      ...existing,
      critereId,
      niveau,
      status: existing?.status || StatusReponse.BROUILLON,
      correctionAddressed: existing?.status === StatusReponse.A_CORRIGER ? true : existing?.correctionAddressed,
    } as Reponse;

    markCorrectionAddressed(critereId);
    setReponses(prev => ({ ...prev, [critereId]: updated }));
    void saveReponseDraft(updated);
  };

  const handleCommentChange = (critereId: string, commentaire: string) => {
    if (!canEditCritere(critereId)) return;

    const existing = reponses[critereId];
    const updated = {
      ...existing,
      critereId,
      commentaire,
      status: existing?.status || StatusReponse.BROUILLON,
      correctionAddressed: existing?.status === StatusReponse.A_CORRIGER ? true : existing?.correctionAddressed,
    } as Reponse;

    markCorrectionAddressed(critereId);
    setReponses(prev => ({ ...prev, [critereId]: updated }));
    scheduleReponseDraftSave(updated);
  };

  const handleAddLink = (critereId: string) => {
    if (!canEditCritere(critereId)) return;

    const url = window.prompt(t('evaluationFill.proofLinkPrompt'));
    const trimmedUrl = url?.trim();
    if (!trimmedUrl) return;

    const existing = reponses[critereId];
    const preuveLinks = existing?.preuveLinks || [];
    const updated = {
      ...existing,
      critereId,
      preuveLinks: [...preuveLinks, trimmedUrl],
      status: existing?.status || StatusReponse.BROUILLON,
      correctionAddressed: existing?.status === StatusReponse.A_CORRIGER ? true : existing?.correctionAddressed,
    } as Reponse;

    markCorrectionAddressed(critereId);
    setReponses(prev => ({ ...prev, [critereId]: updated }));
    void saveReponseDraft(updated);
  };

  const handleRemoveLink = (critereId: string, linkToRemove: string) => {
    if (!canEditCritere(critereId)) return;

    const existing = reponses[critereId];
    if (!existing) return;
    const updated = {
      ...existing,
      preuveLinks: (existing.preuveLinks || []).filter(link => link !== linkToRemove),
      correctionAddressed: existing.status === StatusReponse.A_CORRIGER ? true : existing.correctionAddressed,
    } as Reponse;

    markCorrectionAddressed(critereId);
    setReponses(prev => ({ ...prev, [critereId]: updated }));
    void saveReponseDraft(updated);
  };

  const handleFileUpload = async (critereId: string, files?: FileList | File[]) => {
    if (!canEditCritere(critereId)) return;

    const filesToUpload = Array.from(files || []);
    if (filesToUpload.length === 0) return;

    const reponse = reponses[critereId];
    if (!reponse?.id) {
      toast.error(t('evaluationFill.notFound'));
      return;
    }

    try {
      const uploadedFileUrls: string[] = [];
      for (const file of filesToUpload) {
        uploadedFileUrls.push(await reponseService.uploadProof(reponse.id, file));
      }
      setReponses(prev => {
        const existing = prev[critereId];
        return {
          ...prev,
          [critereId]: {
            ...existing,
            preuveFiles: [...(existing?.preuveFiles || []), ...uploadedFileUrls],
          } as Reponse,
        };
      });
      markCorrectionAddressed(critereId);
      toast.success(filesToUpload.length > 1 ? t('evaluationFill.uploadedMultiple') : t('evaluationFill.uploadedSingle'));
    } catch (error) {
      toast.error(t('evaluationFill.uploadError'));
    }
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
            preuveFiles: (existing.preuveFiles || []).filter(existingFileUrl => existingFileUrl !== fileUrl),
          } as Reponse,
        };
      });
      markCorrectionAddressed(critereId);
      toast.success(t('evaluationFill.removed'));
    } catch (error) {
      toast.error(t('evaluationFill.removeError'));
    }
  };

  const handleDownloadFile = async (fileUrl: string) => {
    try {
      await fileService.download(fileUrl);
    } catch (error) {
      toast.error(t('evaluationFill.downloadError'));
    }
  };

  const buildEditableReponsesPayload = () =>
    Object.values(reponses).filter(canEditReponse).map(r => ({
        critereId: r.critereId,
        niveau: r.niveau,
        commentaire: r.commentaire,
        preuveLinks: r.preuveLinks,
        correctionAddressed: Boolean(r.correctionAddressed) || touchedCorrectionIds.has(r.critereId),
      }));

  const saveEditableReponses = async () => {
    if (!id) return;

    const reponsesToSave = buildEditableReponsesPayload();
    if (reponsesToSave.length === 0) {
      return;
    }

    const updatedReponses = await reponseService.saveBatch(id, reponsesToSave);
    const repMap: Record<string, Reponse> = {};
    updatedReponses.forEach(r => { repMap[r.critereId] = r; });
    setReponses(repMap);
    setTouchedCorrectionIds(new Set());
  };

  const handleSubmit = async () => {
    if (!id) return;

    const pendingCorrections = Object.values(reponses).filter(r =>
      r.status === StatusReponse.A_CORRIGER && !isCorrectionAddressed(r)
    );
    if (pendingCorrections.length > 0) {
      toast.error(t('evaluationFill.pendingCorrections', { count: pendingCorrections.length }));
      setActivePrincipe(pendingCorrections[0].principeId);
      return;
    }

    if (!confirm(t('evaluation.submitConfirm') + '\n' + t('evaluation.submitWarning'))) return;
    setIsSaving(true);
    try {
      await saveEditableReponses();
      await evaluationService.submit(id);
      toast.success(t('evaluationFill.submitted'));
      navigate('/responsable/dashboard');
    } catch (error) { toast.error(t('evaluationFill.submitError')); }
    finally { setIsSaving(false); }
  };

  const getProgress = () => {
    const total = Object.keys(reponses).length;
    if (total === 0) return 0;
    const answered = Object.values(reponses).filter(isReponseComplete).length;
    return Math.round((answered / total) * 100);
  };

  if (isLoading || !evaluation) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/responsable/dashboard')} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{evaluation.organismeName}</h1>
            <p className="text-gray-500">{t('evaluationFill.evaluationLabel', { year: evaluation.year })}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
            <span className="text-sm text-gray-600">{t('evaluationFill.progressLabel')}</span>
            <div className="w-32 h-2 bg-gray-300 rounded-full"><div className="h-full bg-primary-600 rounded-full transition-all" style={{ width: `${getProgress()}%` }} /></div>
            <span className="text-sm font-medium">{getProgress()}%</span>
          </div>
          <button onClick={handleSubmit} disabled={isSaving || evaluation.status !== StatusEvaluation.EN_COURS} className="btn-success gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Send className="w-4 h-4" /> {t('evaluationFill.submit')}
          </button>
        </div>
      </div>

      {/* Principle tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {principes.map((p) => {
          const principeReponses = p.bonnesPratiques.flatMap(bp => bp.criteres.map(c => reponses[c.id])).filter(Boolean);
          const completed = principeReponses.filter(isReponseComplete).length;
          const total = principeReponses.length;
          const isComplete = total > 0 && completed === total;
          const hasCorrection = principeReponses.some(r => r?.status === StatusReponse.A_CORRIGER);
          return (
            <button
              key={p.id}
              onClick={() => setActivePrincipe(p.id)}
              title={hasCorrection ? t('evaluationFill.principeNeedsCorrection') : undefined}
              className={`relative flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activePrincipe === p.id ? 'bg-primary-700 text-white' : isComplete ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {hasCorrection && (
                <span className={`absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ${
                  activePrincipe === p.id ? 'ring-2 ring-white' : ''
                }`} />
              )}
              <span className="mr-1">{p.number}.</span>{getLocalizedField(p, 'name', language)}
              <span className="ml-1 opacity-70">({completed}/{total})</span>
            </button>
          );
        })}
      </div>

      {/* Active principle content */}
      {principes.filter(p => p.id === activePrincipe).map((principe) => (
        <div key={principe.id} className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{principe.number}. {getLocalizedField(principe, 'name', language)}</h2>
            {getLocalizedField(principe, 'description', language) && (
              <p className="text-gray-500">{getLocalizedField(principe, 'description', language)}</p>
            )}
          </div>

          {principe.bonnesPratiques.map((bp) => (
            <div key={bp.id} className="card">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">{getLocalizedField(bp, 'label', language)}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {bp.criteres.map((critere) => {
                  const reponse = reponses[critere.id];
                  const canEdit = canEditReponse(reponse);
                  const preuves = getLocalizedField(critere, 'preuves', language);
                  const references = getLocalizedField(critere, 'references', language);

                  return (
                    <div key={critere.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{critere.number}. {getLocalizedField(critere, 'label', language)}</p>
                        </div>
                      </div>

                      {reponse?.status === StatusReponse.A_CORRIGER && (
                        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <div className="flex gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <div>
                              <p className="font-semibold">{t('evaluationFill.correctionRequested')}</p>
                              {reponse.validatorComment && <p className="mt-1 text-xs leading-5">{reponse.validatorComment}</p>}
                            </div>
                          </div>
                        </div>
                      )}

                      {(preuves || references) && (
                        <div className="grid gap-2 md:grid-cols-2 mb-3">
                          {preuves && (
                            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900">
                              <div className="flex items-center gap-1 font-semibold mb-1">
                                <FileText className="w-3 h-3" /> {t('evaluationFill.preuvesAttendues')}
                              </div>
                              <p className="leading-relaxed">{preuves}</p>
                            </div>
                          )}
                          {references && (
                            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-700">
                              <div className="font-semibold mb-1">{t('evaluationFill.references')}</div>
                              <p className="leading-relaxed">{references}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Niveau selection */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {niveaux.map((n) => (
                          <button
                            key={n.key}
                            onClick={() => handleNiveauChange(critere.id, n.key)}
                            disabled={!canEdit}
                            className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                              reponse?.niveau === n.key ? n.color + ' ring-2 ring-offset-1' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {t(n.label)}
                          </button>
                        ))}
                      </div>

                      {/* Commentaire */}
                      <textarea
                        value={reponse?.commentaire || ''}
                        onChange={(e) => handleCommentChange(critere.id, e.target.value)}
                        placeholder={t('evaluationFill.commentairePlaceholder')}
                        disabled={!canEdit}
                        className={`input text-sm mb-2 ${!canEdit ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                        rows={2}
                      />

                      {/* Preuves */}
                      {canEdit && (
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700 cursor-pointer">
                            <Upload className="w-3 h-3" /> {t('evaluationFill.attachFile')}
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                handleFileUpload(critere.id, e.target.files || undefined);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddLink(critere.id)}
                            className="text-xs flex items-center gap-1 text-primary-600 hover:text-primary-700"
                          >
                            <Link className="w-3 h-3" /> {t('evaluationFill.addLink')}
                          </button>
                        </div>
                      )}

                      {((reponse?.preuveFiles?.length || 0) > 0 || (reponse?.preuveLinks?.length || 0) > 0) && (
                        <div className="mt-3 space-y-1">
                          {reponse?.preuveFiles?.map((fileUrl) => (
                            <div key={fileUrl} className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5 text-xs">
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(fileUrl)}
                                className="min-w-0 flex-1 truncate text-left text-primary-700 hover:underline"
                              >
                                {t('evaluationFill.fileLabel')} {fileUrl.split('/').pop()}
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(critere.id, fileUrl)}
                                  className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                                  title={t('evaluationFill.removeFileTitle')}
                                  aria-label={t('evaluationFill.removeFileTitle')}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          {reponse?.preuveLinks?.map((preuveLink) => (
                            <div key={preuveLink} className="flex min-w-0 items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5 text-xs">
                              <a href={preuveLink} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-primary-700 hover:underline">
                                {t('evaluationFill.linkLabel')} {preuveLink}
                              </a>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLink(critere.id, preuveLink)}
                                  className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
                                  title={t('evaluationFill.removeFileTitle')}
                                  aria-label={t('evaluationFill.removeFileTitle')}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
