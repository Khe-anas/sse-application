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
      repData.forEach((reponse) => {
        repMap[reponse.critereId] = reponse;
      });
      setEvaluation(evalData);
      setPrincipes(princData);
      setReponses(repMap);
      setActivePrincipe(princData[0]?.id || '');
    } catch (error) {
      toast.error(t('evaluationRead.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBack = () => {
    if (user?.role === Role.ADMIN) {
      navigate('/admin/evaluations');
      return;
    }

    if (user?.role === Role.GOUVERNEMENT) {
      navigate('/gouvernement/evaluations');
      return;
    }

    navigate('/responsable/dashboard');
  };

  const handleDownloadFile = async (fileUrl: string) => {
    try {
      await fileService.download(fileUrl);
    } catch (error) {
      toast.error(t('evaluationRead.downloadError'));
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

  const handleDownloadExcel = async () => {
    if (!id) return;

    try {
      await reportService.downloadExcel(id);
    } catch (error) {
      toast.error(t('evaluationRead.downloadError'));
    }
  };

  const getPrincipeCount = (principe: Principe) => {
    const criteria = principe.bonnesPratiques.flatMap(bp => bp.criteres);
    const answered = criteria.filter((critere) => reponses[critere.id]?.niveau != null).length;
    return { answered, total: criteria.length };
  };

  const statusColors: Record<string, string> = {
    BROUILLON: 'bg-gray-100 text-gray-600',
    SOUMISE: 'bg-blue-100 text-blue-700',
    VALIDEE: 'bg-green-100 text-green-700',
    REJETEE: 'bg-red-100 text-red-700',
    A_CORRIGER: 'bg-amber-100 text-amber-700',
  };

  const evaluationStatusColors: Record<string, string> = {
    EN_COURS: 'bg-amber-100 text-amber-700',
    SOUMISE: 'bg-blue-100 text-blue-700',
    EN_VALIDATION: 'bg-purple-100 text-purple-700',
    VALIDEE: 'bg-green-100 text-green-700',
    REJETEE: 'bg-red-100 text-red-700',
  };

  const levelColors: Record<string, string> = {
    N0: 'bg-red-100 text-red-700',
    N1: 'bg-amber-100 text-amber-700',
    N2: 'bg-blue-100 text-blue-700',
    N3: 'bg-green-100 text-green-700',
  };

  if (isLoading || !evaluation) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button type="button" onClick={handleBack} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{evaluation.organismeName}</h1>
            <p className="text-gray-500">{t('evaluationRead.subtitle', { year: evaluation.year })}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleDownloadPdf} className="btn-outline gap-2">
            <Download className="h-4 w-4" /> {t('evaluationRead.downloadPdf')}
          </button>
          <button type="button" onClick={handleDownloadExcel} className="btn-outline gap-2">
            <FileSpreadsheet className="h-4 w-4" /> {t('evaluationRead.downloadExcel')}
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <p className="text-sm text-gray-500">{t('common.status')}</p>
          <span className={`mt-2 inline-flex badge ${evaluationStatusColors[evaluation.status] || 'bg-gray-100 text-gray-600'}`}>
            {t(`evaluation.status.${evaluation.status}`)}
          </span>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <p className="text-sm text-gray-500">{t('common.score')}</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-primary-700">
            <Award className="h-5 w-5" />
            {evaluation.globalScore != null ? `${evaluation.globalScore.toFixed(1)}%` : '-'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-white p-4">
          <p className="text-sm text-gray-500">{t('common.maturity')}</p>
          <p className="mt-2 text-lg font-semibold text-gray-900">
            {evaluation.maturityLevel ? t(`evaluation.maturity.${evaluation.maturityLevel}`) : '-'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {principes.map((principe) => {
          const { answered, total } = getPrincipeCount(principe);

          return (
            <button
              key={principe.id}
              type="button"
              onClick={() => setActivePrincipe(principe.id)}
              className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activePrincipe === principe.id ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {principe.number}. {getLocalizedField(principe, 'name', language)}
              <span className="ml-1 opacity-70">({answered}/{total})</span>
            </button>
          );
        })}
      </div>

      {principes.filter(p => p.id === activePrincipe).map((principe) => (
        <div key={principe.id} className="space-y-4">
          {principe.bonnesPratiques.map((bp) => (
            <div key={bp.id} className="card">
              <div className="border-b border-gray-100 bg-gray-50 p-4">
                <h3 className="font-semibold text-gray-900">{getLocalizedField(bp, 'label', language)}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {bp.criteres.map((critere) => {
                  const reponse = reponses[critere.id];

                  return (
                    <div key={critere.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">
                            {critere.number}. {getLocalizedField(critere, 'label', language)}
                          </p>
                          {reponse?.commentaire && (
                            <p className="mt-1 text-sm text-gray-500">{reponse.commentaire}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {reponse?.niveau && (
                            <span className={`badge ${levelColors[reponse.niveau] || 'bg-gray-100 text-gray-600'}`}>
                              {reponse.niveau}
                            </span>
                          )}
                          {reponse?.status && (
                            <span className={`badge ${statusColors[reponse.status] || 'bg-gray-100 text-gray-600'}`}>
                              {t(`reponseStatus.${reponse.status}`)}
                            </span>
                          )}
                        </div>
                      </div>

                      {(reponse?.validatorComment || reponse?.rejectionReason) && (
                        <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
                          {reponse.validatorComment && <p>{reponse.validatorComment}</p>}
                          {reponse.rejectionReason && <p>{reponse.rejectionReason}</p>}
                        </div>
                      )}

                      {((reponse?.preuveFiles?.length || 0) > 0 || (reponse?.preuveLinks?.length || 0) > 0) && (
                        <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                            {t('evaluationRead.evidence')}
                          </p>
                          <div className="space-y-1.5">
                            {reponse?.preuveFiles?.map((fileUrl) => (
                              <button
                                key={fileUrl}
                                type="button"
                                onClick={() => handleDownloadFile(fileUrl)}
                                className="flex max-w-full min-w-0 items-center gap-2 text-left text-xs text-primary-700 hover:underline"
                              >
                                <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="min-w-0 truncate">{fileUrl.split('/').pop()}</span>
                              </button>
                            ))}
                            {reponse?.preuveLinks?.map((preuveLink) => (
                              <a
                                key={preuveLink}
                                href={preuveLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex max-w-full min-w-0 items-center gap-2 text-xs text-primary-700 hover:underline"
                              >
                                <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="min-w-0 truncate">{preuveLink}</span>
                              </a>
                            ))}
                          </div>
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
