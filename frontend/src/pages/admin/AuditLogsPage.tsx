import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, History } from 'lucide-react';
import { toast } from 'sonner';
import { auditLogService } from '@/services/auditLogService';
import type { AuditLog, PageResponse } from '@/types';
import { formatBackendDateTime } from '@/utils/date';
import KPICard from '@/components/dashboard/KPICard';

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SUBMIT', 'VALIDATE', 'SEND', 'RESET_PASSWORD', 'RESOLVE'];
const ENTITIES = ['USER', 'EVALUATION', 'ACCOUNT_REQUEST', 'RECLAMATION', 'MESSAGE', 'ANNOUNCEMENT'];

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<PageResponse<AuditLog> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await auditLogService.getAll({
        action: action || undefined,
        entity: entity || undefined,
        page: 0,
        size: 100,
      });
      setLogs(data);
    } catch (error) {
      toast.error(t('auditLogs.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [action, entity, t]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = logs?.content.filter((log) =>
    !searchEmail || log.userEmail.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('navigation.auditLogs')}</h1>
      </div>

      <KPICard title={t('auditLogs.total')} value={logs?.totalElements || 0} icon={History} color="primary" />

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">{t('auditLogs.actionLabel')}</label>
            <select className="select" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{t(`auditLogs.actionValues.${a}`, a)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('auditLogs.entityLabel')}</label>
            <select className="select" value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="">{t('common.all')}</option>
              {ENTITIES.map((e) => (
                <option key={e} value={e}>{t(`auditLogs.entity.${e}`, e)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('common.email')}</label>
            <input
              type="text"
              className="input"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder={t('auditLogs.searchByEmail')}
            />
          </div>
          <div className="flex items-end">
            <button onClick={loadLogs} className="btn-primary gap-2 w-full">
              <Filter className="w-4 h-4" />
              {t('common.filter')}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead className="table-head">
            <tr>
              <th className="table-th">{t('common.date')}</th>
              <th className="table-th">{t('common.user')}</th>
              <th className="table-th">{t('auditLogs.actionLabel')}</th>
              <th className="table-th">{t('auditLogs.entityLabel')}</th>
              <th className="table-th">{t('auditLogs.details')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="table-td text-center py-8">{t('common.loading')}</td>
              </tr>
            ) : !filteredLogs || filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="table-td text-center py-8 text-gray-500">{t('auditLogs.empty')}</td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="table-td text-sm text-gray-500 whitespace-nowrap">
                    {formatBackendDateTime(log.createdAt)}
                  </td>
                  <td className="table-td">
                    <div className="text-sm font-medium">{log.userFullName}</div>
                    <div className="text-xs text-gray-500">{log.userEmail}</div>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${actionBadgeClass(log.action)}`}>
                      {t(`auditLogs.actionValues.${log.action}`, log.action)}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className="badge bg-gray-100 text-gray-700">
                      {t(`auditLogs.entityValues.${log.entity}`, log.entity)}
                    </span>
                  </td>
                  <td className="table-td text-sm text-gray-600 max-w-xs truncate">
                    {log.newValue || '-'}
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

function actionBadgeClass(action: string) {
  switch (action) {
    case 'CREATE': return 'bg-green-100 text-green-700';
    case 'UPDATE': return 'bg-blue-100 text-blue-700';
    case 'DELETE': return 'bg-red-100 text-red-700';
    case 'APPROVE': return 'bg-emerald-100 text-emerald-700';
    case 'REJECT': return 'bg-rose-100 text-rose-700';
    case 'SUBMIT': return 'bg-cyan-100 text-cyan-700';
    case 'VALIDATE': return 'bg-teal-100 text-teal-700';
    case 'SEND': return 'bg-indigo-100 text-indigo-700';
    case 'RESET_PASSWORD': return 'bg-amber-100 text-amber-700';
    case 'RESOLVE': return 'bg-lime-100 text-lime-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}
