import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  BellRing,
  Check,
  Eye,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminAccessService, type RoleDefinitionPayload } from '@/services/adminAccessService';
import { Role, type PermissionDefinition, type RoleDefinition } from '@/types';

const emptyRole: RoleDefinitionPayload = {
  label: '',
  description: '',
  permissionCodes: [],
  active: true,
};

const actionIcons = {
  READ: Eye,
  WRITE: Pencil,
  NOTIFY: BellRing,
};

export default function AccessControlPage() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [form, setForm] = useState<RoleDefinitionPayload>(emptyRole);
  const [showEditor, setShowEditor] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedRoles, loadedPermissions] = await Promise.all([
        adminAccessService.getRoles(),
        adminAccessService.getPermissions(),
      ]);
      setRoles(loadedRoles);
      setPermissions(loadedPermissions);
    } catch {
      toast.error(t('accessControl.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const permissionGroups = useMemo(
    () => Object.entries(
      permissions.reduce<Record<string, PermissionDefinition[]>>((groups, permission) => {
        (groups[permission.resourceCode] ||= []).push(permission);
        return groups;
      }, {}),
    ),
    [permissions],
  );

  const openCreate = () => {
    setEditingRole(null);
    setForm({ ...emptyRole, permissionCodes: [] });
    setShowEditor(true);
  };

  const openEdit = (role: RoleDefinition) => {
    setEditingRole(role);
    setForm({
      code: role.code,
      label: role.label,
      description: role.description || '',
      permissionCodes: [...role.permissionCodes],
      active: role.active,
    });
    setShowEditor(true);
  };

  const togglePermission = (code: string) => {
    if (editingRole?.systemRole && editingRole.code === Role.ADMIN) return;
    setForm((current) => ({
      ...current,
      permissionCodes: current.permissionCodes.includes(code)
        ? current.permissionCodes.filter((value) => value !== code)
        : [...current.permissionCodes, code],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (editingRole) {
        await adminAccessService.updateRole(editingRole.id, form);
        toast.success(t('accessControl.updated'));
      } else {
        await adminAccessService.createRole(form);
        toast.success(t('accessControl.created'));
      }
      setShowEditor(false);
      await loadData();
    } catch {
      toast.error(t('accessControl.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">{t('accessControl.eyebrow')}</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100">
            {t('accessControl.title')}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-slate-400">{t('accessControl.subtitle')}</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary gap-2 self-start">
          <Plus className="h-4 w-4" />
          {t('accessControl.newRole')}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={ShieldCheck} label={t('accessControl.rolesCount')} value={roles.length} />
        <SummaryCard icon={Users} label={t('accessControl.assignedUsers')} value={roles.reduce((sum, role) => sum + role.usersCount, 0)} />
        <SummaryCard icon={Check} label={t('accessControl.permissionsCount')} value={permissions.length} />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">{t('accessControl.rolesTitle')}</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{t('accessControl.rolesHint')}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-th">{t('accessControl.role')}</th>
                <th className="table-th">{t('accessControl.permissions')}</th>
                <th className="table-th">{t('accessControl.users')}</th>
                <th className="table-th">{t('common.status')}</th>
                <th className="table-th text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-[#132129]">
              {isLoading ? (
                <tr><td colSpan={5} className="table-td py-10 text-center">{t('common.loading')}</td></tr>
              ) : roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${role.systemRole ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200'}`}>
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-slate-100">{role.label}</p>
                        <p className="text-xs text-gray-400">{role.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {t('accessControl.permissionBadge', { count: role.permissionCodes.length })}
                    </span>
                  </td>
                  <td className="table-td tabular-nums">{role.usersCount}</td>
                  <td className="table-td">
                    <span className={`badge ${role.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {role.active ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="table-td text-end">
                    <button type="button" onClick={() => openEdit(role)} className="icon-button h-9 w-9" title={t('common.edit')} aria-label={t('common.edit')}>
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showEditor && createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="role-editor-title">
          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#132129]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700 dark:text-primary-300">{t('accessControl.editorEyebrow')}</p>
                <h2 id="role-editor-title" className="mt-1 text-xl font-bold text-gray-900 dark:text-slate-100">
                  {editingRole ? t('accessControl.editRole') : t('accessControl.createRole')}
                </h2>
              </div>
              <button type="button" onClick={() => setShowEditor(false)} className="icon-button" aria-label={t('common.close')}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="role-label" className="label">{t('accessControl.roleName')} *</label>
                    <input id="role-label" required className="input" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="role-code" className="label">{t('accessControl.code')}</label>
                    <input id="role-code" className="input uppercase" disabled={Boolean(editingRole)} placeholder={t('accessControl.codePlaceholder')} value={form.code || ''} onChange={(event) => setForm({ ...form, code: event.target.value })} />
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-600" disabled={Boolean(editingRole?.systemRole)} checked={form.active ?? true} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                    <span>
                      <span className="block text-sm font-semibold text-gray-800 dark:text-slate-100">{t('accessControl.activeRole')}</span>
                      <span className="block text-xs text-gray-500 dark:text-slate-400">{t('accessControl.activeRoleHint')}</span>
                    </span>
                  </label>
                  <div className="md:col-span-2">
                    <label htmlFor="role-description" className="label">{t('common.description')}</label>
                    <textarea id="role-description" rows={2} className="input" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                  </div>
                </div>

                <div>
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">{t('accessControl.permissionMatrix')}</h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{t('accessControl.permissionMatrixHint')}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {permissionGroups.map(([resource, resourcePermissions]) => (
                      <fieldset key={resource} className="rounded-xl border border-gray-200 p-4 dark:border-slate-700">
                        <legend className="px-1 text-sm font-bold text-gray-800 dark:text-slate-100">
                          {t(`accessControl.resources.${resource}`, { defaultValue: resource })}
                        </legend>
                        <div className="mt-1 space-y-2">
                          {resourcePermissions.map((permission) => {
                            const Icon = actionIcons[permission.action];
                            const checked = form.permissionCodes.includes(permission.code);
                            const locked = Boolean(editingRole?.systemRole && editingRole.code === Role.ADMIN);
                            return (
                              <label key={permission.code} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${checked ? 'border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/20' : 'border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800/40'} ${locked ? 'cursor-not-allowed opacity-75' : ''}`}>
                                <input type="checkbox" checked={checked} disabled={locked} onChange={() => togglePermission(permission.code)} className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-600" />
                                <Icon className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                                <span className="min-w-0">
                                  <span className="block text-sm font-medium text-gray-800 dark:text-slate-100">{permission.label}</span>
                                  {permission.description && <span className="block truncate text-xs text-gray-500 dark:text-slate-400">{permission.description}</span>}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-slate-800">
                <button type="button" onClick={() => setShowEditor(false)} className="btn-outline" disabled={isSaving}>{t('common.cancel')}</button>
                <button type="submit" className="btn-primary gap-2" disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: number }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-slate-100">{value}</p>
        <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}
