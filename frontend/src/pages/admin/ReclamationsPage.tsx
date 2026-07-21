import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { CheckCircle2, Eye, Lock, MessageSquareWarning, Search } from 'lucide-react';
import { toast } from 'sonner';
import KPICard from '@/components/dashboard/KPICard';
import { reclamationService } from '@/services/reclamationService';
import { useAuthStore } from '@/stores/authStore';
import { formatBackendDateTime } from '@/utils/date';
import { ReclamationStatus } from '@/types';
import type { PageResponse, Reclamation } from '@/types';

export default function ReclamationsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [reclamations, setReclamations] = useState<PageResponse<Reclamation> | null>(null);
  const [selectedReclamation, setSelectedReclamation] = useState<Reclamation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ReclamationStatus | ''>('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const loadReclamations = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await reclamationService.getAll({
        status: status || undefined,
        search: search || undefined,
        size: 20,
      });
      setReclamations(data);
    } catch (error) {
      toast.error(t('reclamationsPage.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [search, status, t]);

  useEffect(() => {
    loadReclamations();
  }, [loadReclamations]);

  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) {
        void loadReclamations(false);
      }
    };

    const interval = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadReclamations]);

  useEffect(() => {
    if (!selectedReclamation || selectedReclamation.status === ReclamationStatus.RESOLVED) return undefined;

    const keepLockAlive = () => {
      if (!document.hidden) {
        void reclamationService.claim(selectedReclamation.id).catch(() => undefined);
      }
    };

    const interval = window.setInterval(keepLockAlive, 60000);
    return () => {
      window.clearInterval(interval);
      void reclamationService.release(selectedReclamation.id).catch(() => undefined);
    };
  }, [selectedReclamation]);

  const openReclamation = async (reclamation: Reclamation) => {
    if (isLockedByOther(reclamation, user?.id)) return;

    setClaimingId(reclamation.id);
    try {
      const claimed = await reclamationService.claim(reclamation.id);
      setSelectedReclamation(claimed);
      setAdminResponse(claimed.adminResponse || '');
      loadReclamations();
    } catch (error) {
      toast.error(getErrorMessage(error, t('reclamationsPage.claimError')));
      loadReclamations();
    } finally {
      setClaimingId(null);
    }
  };

  const handleResolve = async () => {
    if (!selectedReclamation) return;

    setIsResolving(true);
    try {
      const resolved = await reclamationService.resolve(selectedReclamation.id, adminResponse.trim() || undefined);
      setSelectedReclamation(resolved);
      toast.success(t('reclamationsPage.resolved'));
      loadReclamations();
    } catch (error) {
      toast.error(getErrorMessage(error, t('reclamationsPage.resolveError')));
    } finally {
      setIsResolving(false);
    }
  };

  const closeSelectedReclamation = () => {
    const current = selectedReclamation;
    if (current && current.status !== ReclamationStatus.RESOLVED) {
      void reclamationService.release(current.id).catch(() => undefined);
      void loadReclamations(false);
    }
    setSelectedReclamation(null);
  };

  const formatDate = (value?: string) => {
    return formatBackendDateTime(value);
  };

  const pendingCount = reclamations?.content.filter((item) => item.status === ReclamationStatus.PENDING).length || 0;
  const lockedCount = reclamations?.content.filter((item) => isLockedByOther(item, user?.id)).length || 0;
  const canResolveSelected =
    selectedReclamation?.status !== ReclamationStatus.RESOLVED
    && selectedReclamation?.openedById === user?.id;

  const statusClasses: Record<ReclamationStatus, string> = {
    [ReclamationStatus.PENDING]: 'bg-amber-100 text-amber-700',
    [ReclamationStatus.IN_REVIEW]: 'bg-blue-100 text-blue-700',
    [ReclamationStatus.RESOLVED]: 'bg-green-100 text-green-700',
  };

  return (
    <div className="page-shell">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('reclamationsPage.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('reclamationsPage.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KPICard title={t('reclamationsPage.kpiTotal')} value={reclamations?.totalElements || 0} icon={MessageSquareWarning} color="primary" />
        <KPICard title={t('reclamationsPage.kpiPending')} value={pendingCount} icon={Eye} color="warning" />
        <KPICard title={t('reclamationsPage.kpiLocked')} value={lockedCount} icon={Lock} color="danger" />
      </div>

      <div className="filter-panel">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-10"
              placeholder={t('reclamationsPage.searchPlaceholder')}
            />
          </div>
          <select
            className="select"
            value={status}
            onChange={(event) => setStatus(event.target.value as ReclamationStatus | '')}
          >
            <option value="">{t('common.selectAll')}</option>
            <option value={ReclamationStatus.PENDING}>{t('reclamationStatus.PENDING')}</option>
            <option value={ReclamationStatus.IN_REVIEW}>{t('reclamationStatus.IN_REVIEW')}</option>
            <option value={ReclamationStatus.RESOLVED}>{t('reclamationStatus.RESOLVED')}</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead className="table-head">
            <tr>
              <th className="table-th">{t('common.organisme')}</th>
              <th className="table-th">{t('reclamationsPage.subject')}</th>
              <th className="table-th">{t('common.responsible')}</th>
              <th className="table-th">{t('common.status')}</th>
              <th className="table-th">{t('reclamationsPage.openedBy')}</th>
              <th className="table-th">{t('common.date')}</th>
              <th className="table-th">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="table-td py-8 text-center">{t('common.loading')}</td>
              </tr>
            ) : reclamations?.content.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-td py-8 text-center text-gray-500">{t('reclamationsPage.empty')}</td>
              </tr>
            ) : (
              reclamations?.content.map((reclamation) => {
                const locked = isLockedByOther(reclamation, user?.id);

                return (
                  <tr key={reclamation.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{reclamation.organismeName}</td>
                    <td className="table-td text-gray-700">{reclamation.subject}</td>
                    <td className="table-td text-gray-500">{reclamation.submittedByName}</td>
                    <td className="table-td">
                      <span className={`badge ${statusClasses[reclamation.status]}`}>
                        {t(`reclamationStatus.${reclamation.status}`)}
                      </span>
                    </td>
                    <td className="table-td text-gray-500">{reclamation.openedByName || '-'}</td>
                    <td className="table-td text-gray-500">{formatDate(reclamation.createdAt)}</td>
                    <td className="table-td">
                      <button
                        type="button"
                        onClick={() => openReclamation(reclamation)}
                        disabled={locked || claimingId === reclamation.id}
                        className="btn-outline btn-sm gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                        title={locked ? t('reclamationsPage.lockedBy', { name: reclamation.openedByName }) : undefined}
                      >
                        {locked ? <Lock className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {locked ? t('reclamationsPage.locked') : t('reclamationsPage.examine')}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedReclamation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase text-primary-700">{t('reclamationsPage.modalTitle')}</p>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">{selectedReclamation.subject}</h2>
                  <p className="mt-1 text-sm text-gray-500">{selectedReclamation.organismeName} - {formatDate(selectedReclamation.createdAt)}</p>
                </div>
                <button onClick={closeSelectedReclamation} className="btn-outline btn-sm">{t('common.close')}</button>
              </div>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Info label={t('common.responsible')} value={selectedReclamation.submittedByName} />
                <Info label={t('common.email')} value={selectedReclamation.submittedByEmail} />
                <Info label={t('reclamationsPage.openedBy')} value={selectedReclamation.openedByName || '-'} />
                <Info label={t('reclamationsPage.openedAt')} value={formatDate(selectedReclamation.openedAt)} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900">{t('common.message')}</h3>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                  {selectedReclamation.message}
                </p>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={`badge ${statusClasses[selectedReclamation.status]}`}>
                    {t(`reclamationStatus.${selectedReclamation.status}`)}
                  </span>
                  {selectedReclamation.resolvedAt && (
                    <span className="text-xs text-gray-500">{t('reclamationsPage.resolvedAt', { date: formatDate(selectedReclamation.resolvedAt) })}</span>
                  )}
                </div>
                {selectedReclamation.adminResponse && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{selectedReclamation.adminResponse}</p>
                )}
              </div>

              {canResolveSelected && (
                <div className="space-y-4 rounded-lg border border-primary-100 p-4">
                  <div>
                    <label className="label">{t('reclamationsPage.adminResponse')}</label>
                    <textarea
                      rows={4}
                      className="input"
                      value={adminResponse}
                      onChange={(event) => setAdminResponse(event.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={isResolving}
                      className="btn-success gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isResolving ? t('reclamationsPage.resolving') : t('reclamationsPage.resolve')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function isLockedByOther(reclamation: Reclamation, userId?: string) {
  return reclamation.status !== ReclamationStatus.RESOLVED
    && Boolean(reclamation.openedById && reclamation.openedById !== userId);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || fallback;
  }
  return fallback;
}
