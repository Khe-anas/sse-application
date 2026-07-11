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

  const isCorrectionAddressed = (reponse: Reponse | undefined) =>
    !!reponse
    && (reponse.status !== StatusReponse.A_CORRIGER
        || Boolean(reponse.correctionAddressed)
        || touchedCorrectionIds.has(reponse.critereId));

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
      if (updated) setReponses(prev => ({ ...prev, [updated.critereId]: updated }));
    } catch (error) { toast.error(t('evaluationFill.saveError')); }
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
      ...existing, critereId, niveau,
      status: existing?.status || StatusReponse.BROUILLON,
      correctionAddressed: existing?.status === StatusReponse.A_CORRIGER ? true : existing?.correctionAddressed,
    } as Reponse;
    setReponses(prev => ({ ...prev, [critereId]: updated }));
    if (existing?.status === StatusReponse.A_CORRIGER) {
      setTouchedCorrectionIds(prev => { const next = new Set(prev); next.add(critereId); return next; });
    }
    void saveReponseDraft(updated);
  };

  const handleCommentChange = (critereId: string, commentaire: string) => {
    if (!canEditCritere(critereId)) return;
    const existing = reponses[critereId];
    const updated = {
      ...existing, critereId, commentaire,
      status: existing?.status || StatusReponse.BROUILLON,
      correctionAddressed: existing?.status === StatusReponse.A_CORRIGER ? true : existing?.correctionAddressed,
    } as Reponse;
    setReponses(prev => ({ ...prev, [critereId]: updated }));
    scheduleReponseDraftSave(updated);
  };

  const handleAddLink = (critereId: string) => {
    if (!canEditCritere(critereId)) return;
    const url = window.prompt(t('evaluationFill.proofLinkPrompt'));
    const trimmedUrl = url?.trim();
    if (!trimmedUrl) return;
    const existing = reponses[critereId];
    const updated = {
      ...existing, critereId,
      preuveLinks: [...(existing?.preuveLinks || []), trimmedUrl],
      status: existing?.status || StatusReponse.BROUILLON,
      correctionAddressed: existing?.status === StatusReponse.A_CORRIGER ? true : existing?.correctionAddressed,
    } as Reponse;
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
    setReponses(prev => ({ ...prev, [critereId]: updated }));
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
        return { ...prev, [critereId]: { ...existing, preuveFiles: [...(existing?.preuveFiles || []), ...uploadedFileUrls] } as Reponse };
      });
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
        return { ...prev, [critereId]: { ...existing, preuveFiles: (existing.preuveFiles || []).filter(f => f !== fileUrl) } as Reponse };
      });
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
    const updatedReponses = await reponseService.saveBatch(id, reponsesToSave);
    const repMap: Record<string, Reponse> = {};
    updatedReponses.forEach(r => { repMap[r.critereId] = r; });
    setReponses(repMap);
    setTouchedCorrectionIds(new Set());
  };

  const handleSubmit = async () => {
    if (!id) return;
    const pendingCorrections = Object.values(reponses).filter(r =>
      r.status === StatusReponse.A_CORRIGER && !isCorrectionAddressed(r));
    if (pendingCorrections.length > 0) {
      toast.error(t('evaluationFill.pendingCorrections', { count: pendingCorrections.length }));
      return;
    }
    if (!confirm(t('evaluation.submitConfirm') + '\n' + t('evaluation.submitWarning'))) return;
    setIsSaving(true);
    try {
      await saveEditableReponses();
      await evaluationService.submit(id);
      toast.success(t('evaluationFill.submitted'));
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

  const getAllCriteres = () => {
    const active = principes.find(p => p.id === activePrincipe);
    if (!active) return [];
    const rows: { principe: Principe; bp: any; critere: any }[] = [];
    active.bonnesPratiques.forEach(bp => {
      bp.criteres.forEach(critere => {
        rows.push({ principe: active, bp, critere });
      });
    });
    return rows;
  };

  if (isLoading || !evaluation) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div></div>;
  }

  const rows = getAllCriteres();

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
              <span className="mr-1">{p.number}.</span>{getLocalizedField(p, 'name', language)}
              <span className="ml-1 opacity-70">({completed}/{total})</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700 w-10">N°</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700">BP</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Critère</th>
              <th className="px-3 py-2.5 text-center font-semibold text-gray-700 w-12">N0</th>
              <th className="px-3 py-2.5 text-center font-semibold text-gray-700 w-12">N1</th>
              <th className="px-3 py-2.5 text-center font-semibold text-gray-700 w-12">N2</th>
              <th className="px-3 py-2.5 text-center font-semibold text-gray-700 w-12">N3</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700 min-w-[160px]">Preuves & Commentaire</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(() => {
              const groups: { bp: any; criteres: { critere: any; idx: number }[] }[] = [];
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
                    <tr key={item.critere.id} className={`hover:bg-gray-50 ${reponse?.status === StatusReponse.A_CORRIGER ? 'bg-amber-50/50' : ''}`}>
                      {isFirstInGroup ? (
                        <td className="px-3 py-2 text-gray-500 align-top align-middle" rowSpan={group.criteres.length}>{gi + 1}</td>
                      ) : null}
                      {isFirstInGroup ? (
                        <td className="px-3 py-2 text-gray-700 align-top text-xs align-middle" rowSpan={group.criteres.length}>{getLocalizedField(group.bp, 'label', language)}</td>
                      ) : null}
                      <td className="px-3 py-2 text-gray-900 align-top">
                        <span className="font-medium">{item.critere.number}.</span> {getLocalizedField(item.critere, 'label', language)}
                        {reponse?.status === StatusReponse.A_CORRIGER && (
                          <div className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {reponse.validatorComment || t('evaluationFill.correctionRequested')}
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
                              className="w-4 h-4 text-primary-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </div>
                        </td>
                      ))}
                      <td className="px-3 py-2 align-top">
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
                                <button type="button" onClick={() => fileService.download(fileUrl)} className="flex-1 truncate text-left text-primary-700 hover:underline">{fileUrl.split('/').pop()}</button>
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
