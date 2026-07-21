import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, TrendingUp, Award, AlertCircle, Plus, Download, Eye, ArrowRight, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { evaluationService } from '@/services/evaluationService';
import { reportService } from '@/services/reportService';
import { useAuthStore } from '@/stores/authStore';
import { Role, StatusEvaluation } from '@/types';
import type { Evaluation } from '@/types';
import KPICard from '@/components/dashboard/KPICard';
import PageHeader from '@/components/ui/PageHeader';
import ProgressMeter from '@/components/ui/ProgressMeter';

export default function ResponsableDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const loadEvaluations = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    if (user.role === Role.USER && !user.organismeId) {
      setEvaluations([]);
      setIsLoading(false);
      return;
    }

    try {
      const params = user.role === Role.USER ? { organismeId: user.organismeId } : undefined;
      const data = await evaluationService.getAll(params);
      setEvaluations(data.content);
    } catch (error) { toast.error(t('responsable.loadError')); }
    finally { setIsLoading(false); }
  }, [user, t]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const enCours = evaluations.filter(e => e.status === 'EN_COURS').length;
  const soumises = evaluations.filter(e => e.status === 'SOUMISE').length;
  const validees = evaluations.filter(e => e.status === 'VALIDEE');
  const lastScore = validees.length > 0 ? validees[0].globalScore : null;
  const firstInProgress = evaluations.find(e => e.status === StatusEvaluation.EN_COURS);
  const latestValidated = validees[0];
  const evaluationsAnchor = '/user/dashboard#evaluations';

  const handleCreateEvaluation = async () => {
    if (!user?.organismeId) {
      toast.error(t('responsable.notLinked'));
      return;
    }

    setIsCreating(true);
    try {
      const evaluation = await evaluationService.create({
        organismeId: user.organismeId,
        year: new Date().getFullYear(),
      });
      toast.success(t('responsable.created'));
      navigate(`/user/evaluation/${evaluation.id}`);
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || t('responsable.createError')
        : t('responsable.createError');
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownloadPdf = async (evaluationId: string) => {
    try {
      await reportService.downloadPdf(evaluationId);
    } catch (error) {
      toast.error(t('evaluationRead.downloadError'));
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
      <PageHeader
        eyebrow={user?.organismeName || t('app.name')}
        title={user?.role === Role.ADMIN ? t('responsable.adminEvaluationsTitle') : t('navigation.myEvaluations')}
        description={t('responsable.dashboardSubtitle')}
        icon={Building2}
        actions={user?.role === Role.USER ? (
          <button
            onClick={handleCreateEvaluation}
            disabled={isCreating || !user.organismeId}
            className="btn-primary gap-2"
          >
            <Plus className="w-4 h-4" />
            {isCreating ? t('responsable.creating') : t('responsable.new')}
          </button>
        ) : undefined}
      />

      {firstInProgress && (
        <section className="relative overflow-hidden rounded-2xl bg-primary-950 p-6 text-white shadow-panel sm:p-7" aria-labelledby="continue-evaluation-title">
          <div className="absolute -end-10 -top-16 h-48 w-48 rounded-full border-[32px] border-white/5" aria-hidden="true" />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-secondary-300">{t('responsable.nextAction')}</p>
              <h2 id="continue-evaluation-title" className="mt-2 text-2xl font-bold">{t('responsable.continueEvaluation')}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                {firstInProgress.organismeName} · {t('common.year')} {firstInProgress.year}
              </p>
              <button onClick={() => navigate(`/user/evaluation/${firstInProgress.id}`)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-primary-900 transition-colors hover:bg-primary-50">
                {t('responsable.fill')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </button>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <ProgressMeter
                value={firstInProgress.progressPercentage || 0}
                label={t('common.progress')}
                detail={`${firstInProgress.progressPercentage || 0}%`}
              />
              <p className="mt-3 text-xs leading-5 text-blue-100/70">{t('responsable.progressHint')}</p>
            </div>
          </div>
        </section>
      )}
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title={user?.role === Role.ADMIN ? t('responsable.kpiEvaluations') : t('responsable.kpiMyEvaluations')} value={evaluations.length} icon={ClipboardList} color="primary" to={evaluationsAnchor} />
        <KPICard title={t('responsable.kpiInProgress')} value={enCours} icon={AlertCircle} color="warning" to={firstInProgress ? `/user/evaluation/${firstInProgress.id}` : evaluationsAnchor} />
        <KPICard title={t('responsable.kpiSubmitted')} value={soumises} icon={TrendingUp} color="info" to={evaluationsAnchor} />
        <KPICard title={t('responsable.kpiLastScore')} value={lastScore ? `${lastScore.toFixed(1)}%` : '-'} icon={Award} color="success" to={latestValidated ? `/evaluations/${latestValidated.id}/view` : evaluationsAnchor} />
      </div>

      <section id="evaluations" className="card scroll-mt-24 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-700">
          <div>
            <p className="page-eyebrow">{t('common.details')}</p>
            <h2 className="mt-1 section-heading">{user?.role === Role.ADMIN ? t('responsable.listTitleAdmin') : t('responsable.listTitle')}</h2>
          </div>
          <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300">{evaluations.length}</span>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? <div className="p-8 text-center text-gray-500">{t('common.loading')}</div> :
           evaluations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {user?.organismeId ? t('responsable.empty') : t('responsable.notLinkedMessage')}
            </div>
           ) :
           evaluations.map((ev) => (
            <article key={ev.id} className="flex flex-col gap-4 p-5 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-800/50">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{ev.organismeName}</p>
                <p className="mt-1 text-sm text-gray-500">{t('common.year')} {ev.year}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`badge ${statusColors[ev.status]}`}>{t(`evaluation.status.${ev.status}`)}</span>
                {ev.status === 'EN_COURS' && (
                  <button onClick={() => navigate(`/user/evaluation/${ev.id}`)} className="btn-primary btn-sm">
                    {t('responsable.fill')}
                  </button>
                )}
                {ev.status === StatusEvaluation.VALIDEE && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => navigate(`/evaluations/${ev.id}/view`)} className="btn-outline btn-sm gap-2">
                      <Eye className="h-4 w-4" /> {t('common.details')}
                    </button>
                    <button onClick={() => handleDownloadPdf(ev.id)} className="btn-outline btn-sm gap-2">
                      <Download className="h-4 w-4" /> PDF
                    </button>
                  </div>
                )}
                {ev.globalScore != null && <span className="font-bold text-primary-700">{ev.globalScore.toFixed(1)}%</span>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
