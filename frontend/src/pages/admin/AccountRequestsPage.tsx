import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  CheckCircle2,
  Eye,
  FileText,
  Lock,
  Maximize2,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { accountRequestService } from '@/services/accountRequestService';
import { fileService } from '@/services/fileService';
import { useAuthStore } from '@/stores/authStore';
import { formatBackendDateTime } from '@/utils/date';
import { AccountRequestStatus } from '@/types';
import type { AccountRequest, PageResponse, TypeOrganisme } from '@/types';
import KPICard from '@/components/dashboard/KPICard';

export default function AccountRequestsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<PageResponse<AccountRequest> | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AccountRequestStatus | ''>(AccountRequestStatus.PENDING);
  const [adminComment, setAdminComment] = useState('');
  const [queuedEmailJobId, setQueuedEmailJobId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimingRequestId, setClaimingRequestId] = useState<string | null>(null);
  const [logoZoom, setLogoZoom] = useState<{ url: string; alt: string } | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await accountRequestService.getAll({
        status: status || undefined,
        search: search || undefined,
        size: 20,
      });
      setRequests(data);
    } catch (error) {
      toast.error(t('accountRequests.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [search, status, t]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openRequest = async (request: AccountRequest) => {
    if (request.status !== AccountRequestStatus.PENDING) {
      selectRequest(request);
      return;
    }

    if (isRequestLockedByOther(request, user?.id)) {
      toast.error(t('accountRequests.lockedBy', { name: request.reviewedByName }));
      return;
    }

    setClaimingRequestId(request.id);
    try {
      const claimed = await accountRequestService.claim(request.id);
      selectRequest(claimed);
      loadRequests();
    } catch (error) {
      toast.error(getErrorMessage(error, t('accountRequests.claimError')));
      loadRequests();
    } finally {
      setClaimingRequestId(null);
    }
  };

  const selectRequest = (request: AccountRequest) => {
    setSelectedRequest(request);
    setAdminComment(request.adminComment || '');
    setQueuedEmailJobId('');
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      const response = await accountRequestService.approve(selectedRequest.id, {
        adminComment: adminComment.trim() || undefined,
      });
      setSelectedRequest(response.request);
      setQueuedEmailJobId(response.emailJobId || '');
      toast.success(t('accountRequests.approved'));
      loadRequests();
    } catch (error) {
      toast.error(getErrorMessage(error, t('accountRequests.approvedError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!adminComment.trim()) {
      toast.error(t('accountRequests.rejectReasonRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await accountRequestService.reject(selectedRequest.id, { adminComment: adminComment.trim() });
      setSelectedRequest(updated);
      toast.success(t('accountRequests.rejected'));
      loadRequests();
    } catch (error) {
      toast.error(getErrorMessage(error, t('accountRequests.rejectedError')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (value: string) => {
    return formatBackendDateTime(value);
  };

  const pendingCount = requests?.content.filter((request) => request.status === AccountRequestStatus.PENDING).length || 0;

  const getStatusLabel = (s: AccountRequestStatus) => t(`accountRequestStatus.${s}`);
  const getTypeLabel = (type: TypeOrganisme) => t(`organisme.type.${type}`);

  const statusClasses: Record<AccountRequestStatus, string> = {
    [AccountRequestStatus.PENDING]: 'bg-amber-100 text-amber-700',
    [AccountRequestStatus.APPROVED]: 'bg-green-100 text-green-700',
    [AccountRequestStatus.REJECTED]: 'bg-red-100 text-red-700',
  };

  return (
    <div className="page-shell">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('accountRequests.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('accountRequests.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard title={t('accountRequests.kpiDisplayed')} value={requests?.totalElements || 0} icon={FileText} color="primary" />
        <KPICard title={t('accountRequests.kpiPending')} value={pendingCount} icon={ShieldCheck} color="warning" />
        <KPICard title={t('accountRequests.kpiPageSize')} value={requests?.pageSize || 20} icon={CheckCircle2} color="success" />
      </div>

      <div className="filter-panel">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-10"
              placeholder={t('accountRequests.searchPlaceholder')}
            />
          </div>
          <select
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value as AccountRequestStatus | '')}
          >
            <option value="">{t('common.selectAll')}</option>
            <option value={AccountRequestStatus.PENDING}>{t('accountRequests.statusPending')}</option>
            <option value={AccountRequestStatus.APPROVED}>{t('accountRequests.statusApproved')}</option>
            <option value={AccountRequestStatus.REJECTED}>{t('accountRequests.statusRejected')}</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead className="table-head">
            <tr>
              <th className="table-th">{t('common.company')}</th>
              <th className="table-th">{t('common.responsible')}</th>
              <th className="table-th">{t('common.email')}</th>
              <th className="table-th">{t('common.status')}</th>
              <th className="table-th">{t('common.date')}</th>
              <th className="table-th">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="table-td py-8 text-center">{t('common.loading')}</td>
              </tr>
            ) : requests?.content.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-td py-8 text-center text-gray-500">{t('accountRequests.empty')}</td>
              </tr>
            ) : (
              requests?.content.map((request) => {
                const locked = isRequestLockedByOther(request, user?.id);

                return (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{request.companyName}</td>
                    <td className="table-td text-gray-600">{request.responsibleFullName}</td>
                    <td className="table-td text-gray-500">{request.companyEmail}</td>
                    <td className="table-td">
                      <span className={`badge ${statusClasses[request.status]}`}>{getStatusLabel(request.status)}</span>
                      {locked && (
                        <span className="ml-2 badge bg-gray-100 text-gray-600">
                          <Lock className="mr-1 h-3 w-3" />
                          {request.reviewedByName}
                        </span>
                      )}
                    </td>
                    <td className="table-td text-gray-500">{formatDate(request.createdAt)}</td>
                    <td className="table-td">
                      <button
                        onClick={() => openRequest(request)}
                        disabled={locked || claimingRequestId === request.id}
                        className="btn-outline btn-sm gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {locked ? <Lock className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {locked ? t('accountRequests.locked') : t('accountRequests.see')}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase text-primary-700">{t('accountRequests.modalTitle')}</p>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">{selectedRequest.companyName}</h2>
                  <p className="mt-1 text-sm text-gray-500">{formatDate(selectedRequest.createdAt)}</p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="btn-outline btn-sm">{t('accountRequests.close')}</button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Info label={t('common.responsible')} value={selectedRequest.responsibleFullName} />
                <Info label={t('accountRequests.companyType')} value={getTypeLabel(selectedRequest.type) || selectedRequest.type || '-'} />
                <Info label={t('common.email')} value={selectedRequest.companyEmail} />
                <Info label={t('common.phone')} value={selectedRequest.phone || '-'} />
                <Info label={t('requestAccount.fax')} value={selectedRequest.fax || '-'} />
                <Info label={t('accountRequests.companyRole')} value={selectedRequest.companyRole || '-'} />
                <Info label={t('accountRequests.position')} value={selectedRequest.position || '-'} />
                <Info label={t('common.sector')} value={selectedRequest.sector || '-'} />
                <Info label={t('accountRequests.address')} value={selectedRequest.address || '-'} className="md:col-span-2" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('accountRequests.companyLogo')}</h3>
                {selectedRequest.logoUrl ? (
                  <LogoPreview
                    fileUrl={selectedRequest.logoUrl}
                    alt={selectedRequest.companyName}
                    fallback={t('accountRequests.logoLoadError')}
                    zoomLabel={t('accountRequests.zoomLogo')}
                    onZoom={(url, alt) => setLogoZoom({ url, alt })}
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-500">{t('accountRequests.noLogo')}</p>
                )}
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <span className={`badge ${statusClasses[selectedRequest.status]}`}>
                    {getStatusLabel(selectedRequest.status)}
                  </span>
                  {selectedRequest.reviewedByName && (
                    <span className="text-xs text-gray-500">
                      {t('accountRequests.reviewedBy', { name: selectedRequest.reviewedByName })}
                    </span>
                  )}
                  {selectedRequest.processedAt && (
                    <span className="text-xs text-gray-500">{t('accountRequests.processedOn', { date: formatDate(selectedRequest.processedAt) })}</span>
                  )}
                </div>
                {selectedRequest.adminComment && (
                  <p className="mt-3 text-sm text-gray-700">{selectedRequest.adminComment}</p>
                )}
              </div>

              {selectedRequest.status === AccountRequestStatus.PENDING && (
                <div className="space-y-4 rounded-lg border border-primary-100 p-4">
                  <div>
                    <label className="label">{t('accountRequests.adminComment')}</label>
                    <textarea
                      rows={3}
                      className="input"
                      value={adminComment}
                      onChange={(event) => setAdminComment(event.target.value)}
                      placeholder={t('accountRequests.adminCommentPlaceholder')}
                    />
                  </div>
                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      onClick={handleReject}
                      disabled={isSubmitting}
                      className="btn-danger gap-2 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      {t('accountRequests.reject')}
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isSubmitting}
                      className="btn-success gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t('accountRequests.approveAndCreate')}
                    </button>
                  </div>
                </div>
              )}

              {queuedEmailJobId && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-900">{t('accountRequests.activationQueued')}</p>
                  <p className="mt-1 text-sm text-green-800">
                    {t('accountRequests.activationJobLabel')} <span className="font-mono font-semibold">{queuedEmailJobId}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {logoZoom && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLogoZoom(null)}
        >
          <button
            type="button"
            onClick={() => setLogoZoom(null)}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label={t('accountRequests.closeZoom')}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={logoZoom.url}
            alt={logoZoom.alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

function Info({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function LogoPreview({ fileUrl, alt, fallback, zoomLabel, onZoom }: { fileUrl: string; alt: string; fallback: string; zoomLabel?: string; onZoom?: (url: string, alt: string) => void }) {
  const [objectUrl, setObjectUrl] = useState('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    let loadedUrl = '';
    setObjectUrl('');
    setHasError(false);

    fileService.getObjectUrl(fileUrl)
      .then((url) => {
        loadedUrl = url;
        if (active) setObjectUrl(url);
      })
      .catch(() => {
        if (active) setHasError(true);
      });

    return () => {
      active = false;
      if (loadedUrl) window.URL.revokeObjectURL(loadedUrl);
    };
  }, [fileUrl]);

  if (hasError) return <p className="mt-2 text-sm text-red-600">{fallback}</p>;
  if (!objectUrl) return <div className="mt-2 h-24 w-40 animate-pulse bg-gray-100" />;

  return (
    <div className="group relative mt-2 inline-block">
      <div className="flex h-28 w-44 items-center justify-center border border-gray-200 bg-white p-3">
        <img src={objectUrl} alt={alt} className="max-h-full max-w-full object-contain" />
      </div>
      {onZoom && (
        <button
          type="button"
          onClick={() => onZoom(objectUrl, alt)}
          className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/40 text-white opacity-0 transition-opacity hover:bg-black/60 group-hover:opacity-100"
          title={zoomLabel}
          aria-label={zoomLabel}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function isRequestLockedByOther(request: AccountRequest, userId?: string) {
  return request.status === AccountRequestStatus.PENDING
    && Boolean(request.reviewedById && request.reviewedById !== userId);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || fallback;
  }
  return fallback;
}
