import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, Clock3, Mail, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { emailJobService } from '@/services/emailJobService';
import { EmailJobStatus } from '@/types';
import type { EmailJob, PageResponse } from '@/types';
import { formatBackendDateTime } from '@/utils/date';
import KPICard from '@/components/dashboard/KPICard';

export default function EmailJobsPage() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<PageResponse<EmailJob> | null>(null);
  const [status, setStatus] = useState<EmailJobStatus | ''>(EmailJobStatus.FAILED);
  const [isLoading, setIsLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await emailJobService.getAll({
        status: status || undefined,
        size: 50,
      });
      setJobs(data);
    } catch (error) {
      toast.error(t('emailJobs.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [status, t]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleResend = async (job: EmailJob) => {
    setResendingId(job.id);
    try {
      await emailJobService.resend(job.id);
      toast.success(t('emailJobs.resendQueued'));
      loadJobs();
    } catch (error) {
      toast.error(t('emailJobs.resendError'));
    } finally {
      setResendingId(null);
    }
  };

  const pendingCount = jobs?.content.filter((job) => job.status === EmailJobStatus.PENDING).length || 0;
  const failedCount = jobs?.content.filter((job) => job.status === EmailJobStatus.FAILED).length || 0;

  return (
    <div className="page-shell">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('emailJobs.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('emailJobs.subtitle')}</p>
        </div>
        <button onClick={loadJobs} className="btn-outline gap-2">
          <RefreshCw className="h-4 w-4" />
          {t('common.refresh')}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard title={t('emailJobs.kpiDisplayed')} value={jobs?.totalElements || 0} icon={Mail} color="primary" />
        <KPICard title={t('emailJobs.kpiPending')} value={pendingCount} icon={Clock3} color="warning" />
        <KPICard title={t('emailJobs.kpiFailed')} value={failedCount} icon={AlertCircle} color="danger" />
      </div>

      <div className="filter-panel">
        <select
          className="select max-w-xs"
          value={status}
          onChange={(event) => setStatus(event.target.value as EmailJobStatus | '')}
        >
          <option value="">{t('common.selectAll')}</option>
          <option value={EmailJobStatus.FAILED}>{t('emailJobStatus.FAILED')}</option>
          <option value={EmailJobStatus.PENDING}>{t('emailJobStatus.PENDING')}</option>
          <option value={EmailJobStatus.SENT}>{t('emailJobStatus.SENT')}</option>
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead className="table-head">
            <tr>
              <th className="table-th">{t('common.status')}</th>
              <th className="table-th">{t('common.email')}</th>
              <th className="table-th">{t('emailJobs.subject')}</th>
              <th className="table-th">{t('emailJobs.attempts')}</th>
              <th className="table-th">{t('emailJobs.nextAttempt')}</th>
              <th className="table-th">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="table-td py-8 text-center">{t('common.loading')}</td>
              </tr>
            ) : jobs?.content.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-td py-8 text-center text-gray-500">{t('emailJobs.empty')}</td>
              </tr>
            ) : (
              jobs?.content.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <span className={`badge ${statusClass(job.status)}`}>{t(`emailJobStatus.${job.status}`)}</span>
                    {job.sentAt && (
                      <span className="ml-2 inline-flex items-center text-xs text-green-700">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {formatBackendDateTime(job.sentAt)}
                      </span>
                    )}
                  </td>
                  <td className="table-td">
                    <div className="font-medium text-gray-900">{job.toEmail}</div>
                    <div className="text-xs text-gray-500">{job.userName || '-'}</div>
                  </td>
                  <td className="table-td max-w-xs truncate text-gray-600">{job.subject}</td>
                  <td className="table-td text-gray-600">{job.attempts}/{job.maxAttempts}</td>
                  <td className="table-td text-gray-500">{job.nextAttemptAt ? formatBackendDateTime(job.nextAttemptAt) : '-'}</td>
                  <td className="table-td">
                    <div className="space-y-2">
                      {job.status !== EmailJobStatus.SENT && (
                        <button
                          onClick={() => handleResend(job)}
                          disabled={resendingId === job.id}
                          className="btn-outline btn-sm gap-2 disabled:opacity-50"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t('emailJobs.resend')}
                        </button>
                      )}
                      {job.lastError && <p className="max-w-xs break-words text-xs text-red-600">{job.lastError}</p>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusClass(status: EmailJobStatus) {
  if (status === EmailJobStatus.SENT) return 'bg-green-100 text-green-700';
  if (status === EmailJobStatus.FAILED) return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}
