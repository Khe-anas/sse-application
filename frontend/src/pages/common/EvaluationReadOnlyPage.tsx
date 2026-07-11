import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Award, ChevronLeft, Download, FileSpreadsheet, FileText, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { evaluationService, reponseService } from '@/services/evaluationService';
import { fileService } from '@/services/fileService';
import { reportService } from '@/services/reportService';
import api from '@/services/api';
import { Role, type Evaluation, type Principe, type Reponse } from '@/types';
import { getLocalizedField } from '@/utils/localization';
import { useAuthStore } from '@/stores/authStore';

export default function EvaluationReadOnlyPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [principes, setPrincipes] = useState<Principe[]>([]);
  const [reponses, setReponses] = useState<Record<string, Reponse>>({});
  const [activePrincipe, setActivePrincipe] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [evalData, princData, repData] = await Promise.all([
        evaluationService.getById(id),
        api.get<Principe[]>('/principes').then(r => r.data),
        reponseService.getByEvaluation(id),
      ]);
      const repMap: Record<string, Reponse> = {};
      repData.forEach((reponse) => { repMap[reponse.critereId] = reponse; });
      setEvaluation(evalData);
      setPrincipes(princData);
      setReponses(repMap);
      setActivePrincipe(princData[0]?.id || '');
    } catch (error) { toast.error(t('evaluationRead.loadError')); }
    finally { setIsLoading(false); }
  }, [id, t]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleBack = () => {
    if (user?.role === Role.ADMIN) { navigate('/admin/evaluations'); return; }
    if (user?.role === Role.GOUVERNEMENT) { navigate('/gouvernement/evaluations'); return; }
    if (user?.role === Role.EVALUATEUR) { navigate('/evaluateur/evaluations'); return; }
    navigate('/user/dashboard');
  };

  const handleDownloadFile = async (fileUrl: string) => {
    try { await fileService.download(fileUrl); }
    catch (error) { toast.error(t('evaluationRead.downloadError')); }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    try { await reportService.downloadPdf(id); }
    catch (error) { toast.error(t('evaluationRead.downloadError')); }
  };

  const handleDownloadExcel = async () => {
    if (!id) return;
    try { await reportService.downloadExcel(id); }
    catch (error) { toast.error(t('evaluationRead.downloadError')); }
  };

  const levelColors: Record<string, string> = {
    N0: 'bg-red-100 text-red-700', N1: 'bg-amber-100 text-amber-700',
    N2: 'bg-blue-100 text-blue-700', N3: 'bg-green-100 text-green-700',
  };

  const evaluationStatusColors: Record<string, string> = {
    EN_COURS: 'bg-amber-100 text-amber-700', SOUMISE: 'bg-blue-100 text-blue-700',
    EN_VALIDATION: 'bg-purple-100 text-purple-700', VALIDEE: 'bg-green-100 text-green-700',
    REJETEE: 'bg-red-100 text-red-700',
  };

  const getAllCriteres = () => {
    const active = principes.find(p => p.id === activePrincipe);
    if (!active) return [];
    const rows: { principe: Principe; bp: any; critere: any }[] = [];
    active.bonnesPratiques.forEach(bp => {
      bp.criteres.forEach(critere => rows.push({ principe: active, bp, critere }));
    });
    return rows;
  };

  if (isLoading || !evaluation) {
    return <div className="flex h-64 items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-700" /></div>;
  }

  const rows = getAllCriteres();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button type="button" onClick={handleBack} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{evaluation.organismeName} - {evaluation.year}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${evaluationStatusColors[evaluation.status] || 'bg-gray-100 text-gray-600'}`}>{t(`evaluation.status.${evaluation.status}`)}</span>
              {evaluation.globalScore != null && (
                <span className="flex items-center gap-1 text-sm font-semibold text-primary-700">
                  <Award className="w-4 h-4" /> {evaluation.globalScore.toFixed(1)}%
                </span>
              )}
              {evaluation.maturityLevel && (
                <span className="text-sm text-gray-500">- {t(`evaluation.maturity.${evaluation.maturityLevel}`)}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleDownloadPdf} className="btn-outline gap-2 text-sm"><Download className="h-4 w-4" /> {t('evaluationRead.downloadPdf')}</button>
          <button type="button" onClick={handleDownloadExcel} className="btn-outline gap-2 text-sm"><FileSpreadsheet className="h-4 w-4" /> {t('evaluationRead.downloadExcel')}</button>
        </div>
      </div>

      {/* Principle tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {principes.map((principe) => {
          const criteria = principe.bonnesPratiques.flatMap(bp => bp.criteres);
          const answered = criteria.filter((c) => reponses[c.id]?.niveau != null).length;
          return (
            <button key={principe.id} type="button" onClick={() => setActivePrincipe(principe.id)}
              className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activePrincipe === principe.id ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {principe.number}. {getLocalizedField(principe, 'name', language)}
              <span className="ml-1 opacity-70">({answered}/{criteria.length})</span>
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
              <th className="px-3 py-2.5 text-center font-semibold text-gray-700 w-12">Niveau</th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700 min-w-[160px]">Commentaire & Preuves</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, idx) => {
              const reponse = reponses[row.critere.id];
              return (
                <tr key={row.critere.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 align-top">{idx + 1}</td>
                  <td className="px-3 py-2 text-gray-700 align-top text-xs">{getLocalizedField(row.bp, 'label', language)}</td>
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
                    {reponse?.niveau && (
                      <span className={`badge ${levelColors[reponse.niveau]}`}>{reponse.niveau}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {reponse?.commentaire && (
                      <p className="text-xs text-gray-600 mb-1">{reponse.commentaire}</p>
                    )}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
