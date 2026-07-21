import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Eye, Image, KeyRound, Plus, Search, Trash2, ToggleLeft, ToggleRight, Upload, X, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { userService, type CreateUserRequest, type CreateUserWithOrganismeRequest } from '@/services/userService';
import { organismeService } from '@/services/organismeService';
import { fileService } from '@/services/fileService';
import { Role, TypeOrganisme, UserStatus } from '@/types';
import { formatBackendDateTime } from '@/utils/date';
import type { User, PageResponse, Organisme } from '@/types';
import KPICard from '@/components/dashboard/KPICard';
import { Users } from 'lucide-react';
import useConfirmDialog from '@/components/ui/useConfirmDialog';

const MAX_LOGO_SIZE_MB = 5;
const MAX_LOGO_SIZE = MAX_LOGO_SIZE_MB * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const SECTOR_VALUES = [
  'AGRICULTURE', 'INDUSTRY', 'ENERGY', 'CONSTRUCTION', 'COMMERCE', 'TRANSPORT',
  'TECHNOLOGY', 'FINANCE', 'HEALTH', 'EDUCATION', 'TOURISM', 'PUBLIC_ADMINISTRATION',
  'SERVICES', 'CIVIL_SOCIETY', 'OTHER',
] as const;

type NewOrganismeForm = Omit<CreateUserWithOrganismeRequest, 'email' | 'firstName' | 'lastName' | 'password' | 'phone' | 'position'> & {
  otherSector?: string;
};

const emptyNewOrganisme: Partial<NewOrganismeForm> = {
  organisationName: '',
  organisationType: TypeOrganisme.PRIVE,
  sector: '',
  otherSector: '',
  address: '',
  organisationEmail: '',
  organisationPhone: '',
  fax: '',
  website: '',
};

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<PageResponse<User> | null>(null);
  const [organismes, setOrganismes] = useState<Organisme[]>([]);
  const [organismeSearch, setOrganismeSearch] = useState('');
  const [isLoadingOrganismes, setIsLoadingOrganismes] = useState(false);
  const [logoObjectUrls, setLogoObjectUrls] = useState<Record<string, string>>({});
  const [failedLogoUrls, setFailedLogoUrls] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [logoPreview, setLogoPreview] = useState<{ src: string; alt: string } | null>(null);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activationMode, setActivationMode] = useState<'link' | 'password'>('link');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [organisationMode, setOrganisationMode] = useState<'existing' | 'new'>('existing');
  const [newOrganisme, setNewOrganisme] = useState<Partial<NewOrganismeForm>>(emptyNewOrganisme);
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '', firstName: '', lastName: '', position: '',
  });
  const userRequestId = useRef(0);
  const organisationRequestId = useRef(0);
  const { confirm: confirmAction, confirmationDialog } = useConfirmDialog();

  const emptyForm: CreateUserRequest = {
    email: '',
    firstName: '',
    lastName: '',
    position: '',
  };

  const loadUsers = useCallback(async () => {
    const requestId = ++userRequestId.current;
    setIsLoading(true);
    try {
      const usersData = await userService.getAll({
        search: search.trim() || undefined,
        role: (roleFilter as Role) || undefined,
        status: statusFilter || undefined,
      });
      if (requestId === userRequestId.current) setUsers(usersData);
    } catch (error) {
      if (requestId === userRequestId.current) toast.error(t('users.loadError'));
    } finally {
      if (requestId === userRequestId.current) setIsLoading(false);
    }
  }, [search, roleFilter, statusFilter, t]);

  const loadOrganismes = useCallback(async (query = '') => {
    const requestId = ++organisationRequestId.current;
    setIsLoadingOrganismes(true);
    try {
      const data = await organismeService.getAll({ search: query.trim() || undefined, size: 100 });
      if (requestId === organisationRequestId.current) setOrganismes(data.content);
    } catch (error) {
      if (requestId === organisationRequestId.current) toast.error(t('users.organismeLoadError'));
    } finally {
      if (requestId === organisationRequestId.current) setIsLoadingOrganismes(false);
    }
  }, [t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadUsers, 250);
    return () => window.clearTimeout(timeoutId);
  }, [loadUsers]);

  useEffect(() => {
    if (!showModal || formData.role !== Role.USER || organisationMode !== 'existing') return;
    const timeoutId = window.setTimeout(() => loadOrganismes(organismeSearch), 250);
    return () => window.clearTimeout(timeoutId);
  }, [formData.role, loadOrganismes, organisationMode, organismeSearch, showModal]);

  const logoUrlKey = Array.from(new Set(
    users?.content
      .map((user) => user.organismeLogoUrl)
      .filter((logoUrl): logoUrl is string => Boolean(logoUrl)) || [],
  )).sort().join('\0');

  useEffect(() => {
    const logoUrls = logoUrlKey ? logoUrlKey.split('\0') : [];
    const loadedObjectUrls: string[] = [];
    let active = true;

    setLogoObjectUrls({});
    setFailedLogoUrls(new Set());

    logoUrls.forEach((logoUrl) => {
      fileService.getObjectUrl(logoUrl)
        .then((objectUrl) => {
          loadedObjectUrls.push(objectUrl);
          if (!active) {
            window.URL.revokeObjectURL(objectUrl);
            return;
          }

          setLogoObjectUrls((current) => ({ ...current, [logoUrl]: objectUrl }));
        })
        .catch(() => {
          if (!active) return;
          setFailedLogoUrls((current) => new Set(current).add(logoUrl));
        });
    });

    return () => {
      active = false;
      loadedObjectUrls.forEach((objectUrl) => window.URL.revokeObjectURL(objectUrl));
    };
  }, [logoUrlKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const email = formData.email.trim().toLowerCase();
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const phone = formData.phone?.trim();
    const position = formData.position?.trim();

    if (!firstName || !lastName) {
      toast.error(t('users.nameRequired'));
      return;
    }
    if (!formData.role) {
      toast.error(t('users.roleRequired'));
      return;
    }
    if (formData.role === Role.USER && organisationMode === 'existing' && !formData.organismeId) {
      toast.error(t('users.organismeRequired'));
      return;
    }
    if (formData.role === Role.USER && organisationMode === 'new') {
      if (!newOrganisme.organisationName?.trim() || !newOrganisme.organisationType) {
        toast.error(t('users.newOrganismeRequired'));
        return;
      }
      if (!newOrganisme.logo) {
        toast.error(t('requestAccount.toastNeedLogo'));
        return;
      }
      if (newOrganisme.sector === 'OTHER' && !newOrganisme.otherSector?.trim()) {
        toast.error(t('requestAccount.toastNeedOtherSector'));
        return;
      }
    }

    const payload: CreateUserRequest = {
      email,
      firstName,
      lastName,
      role: formData.role,
    };
    if (phone) payload.phone = phone;
    if (position) payload.position = position;

    if (activationMode === 'password') {
      const password = formData.password || '';
      if (password.length < 8) {
        toast.error(t('users.passwordMinLength'));
        return;
      }
      if (password !== passwordConfirmation) {
        toast.error(t('users.passwordMismatch'));
        return;
      }
      payload.password = password;
    }
    if (formData.role === Role.USER) payload.organismeId = formData.organismeId;

    setIsSubmitting(true);
    try {
      if (formData.role === Role.USER && organisationMode === 'new') {
        await userService.createWithOrganisme({
          email,
          firstName,
          lastName,
          password: payload.password,
          phone,
          position,
          organisationName: newOrganisme.organisationName!.trim(),
          organisationType: newOrganisme.organisationType!,
          sector: newOrganisme.sector === 'OTHER'
            ? newOrganisme.otherSector?.trim()
            : newOrganisme.sector?.trim(),
          address: newOrganisme.address?.trim(),
          organisationEmail: newOrganisme.organisationEmail?.trim(),
          organisationPhone: newOrganisme.organisationPhone?.trim(),
          fax: newOrganisme.fax?.trim(),
          website: newOrganisme.website?.trim(),
          logo: newOrganisme.logo!,
        });
      } else {
        await userService.create(payload);
      }
      toast.success(t(activationMode === 'link' ? 'users.createdActivationQueued' : 'users.createdActive'));
      closeCreateModal(true);
      loadUsers();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error || t('users.operationError')
        : t('users.operationError');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    const status = resolveUserStatus(user.status, user.isActive);
    if (status === UserStatus.PENDING_ACTIVATION) return;

    const newActive = status === UserStatus.DISABLED;
    const msg = newActive ? t('users.enableConfirm') : t('users.disableConfirm');
    const confirmed = await confirmAction({
      title: t('common.confirm'),
      description: msg,
      confirmLabel: t('common.confirm'),
      cancelLabel: t('common.cancel'),
      tone: newActive ? 'primary' : 'danger',
    });
    if (!confirmed) return;
    try {
      await userService.update(user.id, { isActive: newActive });
      toast.success(t('users.toggled'));
      loadUsers();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || t('users.toggleError')
        : t('users.toggleError');
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: t('common.confirm'),
      description: t('users.deleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await userService.delete(id);
      toast.success(t('users.deleted'));
      loadUsers();
    } catch (error) {
      toast.error(t('users.deleteError'));
    }
  };

  const handleGeneratePassword = async (id: string) => {
    const confirmed = await confirmAction({
      title: t('common.confirm'),
      description: t('users.generatePasswordConfirm'),
      confirmLabel: t('common.confirm'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmed) return;
    setIsGeneratingPassword(true);
    try {
      await userService.generatePassword(id);
      toast.success(t('users.generatePasswordSuccess'));
      loadUsers();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error || t('users.operationError')
        : t('users.operationError');
      toast.error(message);
    } finally {
      setIsGeneratingPassword(false);
    }
  };

  const handleRoleChange = (role: Role | undefined) => {
    setFormData({
      ...formData,
      role,
      organismeId: role === Role.USER ? formData.organismeId : undefined,
    });
    if (role !== Role.USER) {
      setOrganismeSearch('');
      setOrganismes([]);
    }
  };

  const handleLogoSelected = (files: FileList | null) => {
    const logo = files?.[0];
    if (!logo) return;
    if (!ALLOWED_LOGO_TYPES.has(logo.type)) {
      toast.error(t('requestAccount.toastOnlyImages'));
      return;
    }
    if (logo.size > MAX_LOGO_SIZE) {
      toast.error(t('requestAccount.toastLogoTooBig', { max: MAX_LOGO_SIZE_MB }));
      return;
    }
    setNewOrganisme((current) => ({ ...current, logo }));
  };

  const closeCreateModal = (force = false) => {
    if (isSubmitting && !force) return;
    setShowModal(false);
    setFormData(emptyForm);
    setActivationMode('link');
    setPasswordConfirmation('');
    setOrganisationMode('existing');
    setNewOrganisme(emptyNewOrganisme);
    setOrganismeSearch('');
    setOrganismes([]);
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
    setActivationMode('link');
    setPasswordConfirmation('');
    setOrganisationMode('existing');
    setNewOrganisme(emptyNewOrganisme);
    setOrganismeSearch('');
    setOrganismes([]);
    setShowModal(true);
  };

  return (
    <div className="page-shell">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('navigation.users')}</h1>
        <button
          onClick={openCreateModal}
          className="btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('users.new')}
        </button>
      </div>

      <KPICard title={t('users.total')} value={users?.totalElements || 0} icon={Users} color="primary" />

      {/* Search */}
      <div className="filter-panel">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('users.searchPlaceholder')}
              className="input pl-10"
            />
          </div>
          <div>
            <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">{t('common.allRoles')}</option>
              <option value={Role.ADMIN}>{t('user.role.ADMIN')}</option>
              <option value={Role.USER}>{t('user.role.USER')}</option>
              <option value={Role.EVALUATEUR}>{t('user.role.EVALUATEUR')}</option>
              <option value={Role.GOUVERNEMENT}>{t('user.role.GOUVERNEMENT')}</option>
            </select>
          </div>
          <div>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
              aria-label={t('users.statusFilterLabel')}
            >
              <option value="">{t('users.allStatuses')}</option>
              <option value={UserStatus.ACTIVE}>{t('userStatus.ACTIVE')}</option>
              <option value={UserStatus.DISABLED}>{t('userStatus.DISABLED')}</option>
              <option value={UserStatus.PENDING_ACTIVATION}>{t('userStatus.PENDING_ACTIVATION')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead className="table-head">
            <tr>
              <th className="table-th">{t('common.name')}</th>
              <th className="table-th">{t('common.email')}</th>
              <th className="table-th">{t('users.roleLabel')}</th>
              <th className="table-th">{t('users.organisme')}</th>
              <th className="table-th">{t('common.logo')}</th>
              <th className="table-th">{t('common.status')}</th>
              <th className="table-th">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="table-td text-center py-8">{t('common.loading')}</td>
              </tr>
            ) : users?.content.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-td text-center py-8 text-gray-500">{t('users.empty')}</td>
              </tr>
            ) : (
              users?.content.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{user.fullName}</td>
                  <td className="table-td text-gray-500">{user.email}</td>
                  <td className="table-td">
                    <span className={`badge ${
                      user.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' :
                      user.role === Role.EVALUATEUR ? 'bg-orange-100 text-orange-700' :
                      user.role === Role.GOUVERNEMENT ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {t(`user.role.${user.role}`)}
                    </span>
                  </td>
                  <td className="table-td text-gray-500">{user.organismeName || '-'}</td>
                  <td className="table-td">
                    <OrganisationLogo
                      logoUrl={user.organismeLogoUrl}
                      objectUrl={user.organismeLogoUrl ? logoObjectUrls[user.organismeLogoUrl] : undefined}
                      hasError={user.organismeLogoUrl ? failedLogoUrls.has(user.organismeLogoUrl) : false}
                      alt={user.organismeName || t('common.logo')}
                      onPreview={(src, alt) => setLogoPreview({ src, alt })}
                      previewLabel={t('users.enlargeLogo')}
                    />
                  </td>
                  <td className="table-td">
                    <span className={`badge ${userStatusClass(user.status, user.isActive)}`}>
                      {t(`userStatus.${user.status || (user.isActive ? UserStatus.ACTIVE : UserStatus.DISABLED)}`)}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewingUser(user)}
                        className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"
                        title={t('users.viewDetails')}
                        aria-label={t('users.viewDetails')}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleGeneratePassword(user.id)}
                        disabled={isGeneratingPassword}
                        className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                        title={t('users.generatePassword')}
                        aria-label={t('users.generatePassword')}
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        disabled={resolveUserStatus(user.status, user.isActive) === UserStatus.PENDING_ACTIVATION}
                        className={`rounded-md p-1.5 transition-colors ${accountToggleButtonClass(user.status, user.isActive)}`}
                        title={accountToggleButtonTitle(user.status, user.isActive, t)}
                        aria-label={accountToggleButtonTitle(user.status, user.isActive, t)}
                      >
                        {resolveUserStatus(user.status, user.isActive) === UserStatus.DISABLED
                          ? <ToggleRight className="w-4 h-4" />
                          : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" title={t('common.delete')} aria-label={t('common.delete')}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create user modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/60 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="create-user-title">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl animate-fade-in dark:bg-slate-900">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
              <button type="button" onClick={() => closeCreateModal()} disabled={isSubmitting} className="icon-button" title={t('users.backToList')} aria-label={t('users.backToList')}>
                <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
              </button>
              <h2 id="create-user-title" className="min-w-0 flex-1 text-xl font-bold text-gray-900 dark:text-slate-100">{t('users.createTitle')}</h2>
              <button type="button" onClick={() => closeCreateModal()} disabled={isSubmitting} className="icon-button" title={t('common.close')} aria-label={t('common.close')}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
                <legend className="px-2 text-sm font-semibold text-gray-900">{t('users.identitySection')}</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="new-user-first-name" className="label">{t('users.firstName')} *</label>
                    <input id="new-user-first-name" type="text" required className="input" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="new-user-last-name" className="label">{t('users.lastName')} *</label>
                    <input id="new-user-last-name" type="text" required className="input" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="new-user-position" className="label">{t('users.position')}</label>
                    <input id="new-user-position" type="text" className="input" value={formData.position || ''} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="new-user-phone" className="label">{t('users.directPhone')}</label>
                    <input id="new-user-phone" type="tel" className="input" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
                <legend className="px-2 text-sm font-semibold text-gray-900">{t('users.accessSection')}</legend>
                <div>
                  <label htmlFor="new-user-email" className="label">{t('users.loginEmail')} *</label>
                  <input id="new-user-email" type="email" required autoComplete="email" className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label htmlFor="new-user-role" className="label">{t('users.roleLabel')} *</label>
                  <select id="new-user-role" required className="select" value={formData.role || ''} onChange={(e) => handleRoleChange(e.target.value ? e.target.value as Role : undefined)}>
                    <option value="">{t('users.selectRole')}</option>
                    <option value={Role.ADMIN}>{t('user.role.ADMIN')}</option>
                    <option value={Role.USER}>{t('user.role.USER')}</option>
                    <option value={Role.EVALUATEUR}>{t('user.role.EVALUATEUR')}</option>
                    <option value={Role.GOUVERNEMENT}>{t('user.role.GOUVERNEMENT')}</option>
                  </select>
                </div>
              </fieldset>

              {formData.role === Role.USER && (
                <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
                  <legend className="px-2 text-sm font-semibold text-gray-900">{t('users.organisationSection')}</legend>
                  <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1 dark:bg-slate-800">
                    <button type="button" onClick={() => setOrganisationMode('existing')} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${organisationMode === 'existing' ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-300' : 'text-gray-500'}`}>
                      {t('users.useExistingOrganisme')}
                    </button>
                    <button type="button" onClick={() => setOrganisationMode('new')} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${organisationMode === 'new' ? 'bg-white text-primary-700 shadow-sm dark:bg-slate-700 dark:text-primary-300' : 'text-gray-500'}`}>
                      {t('users.createNewOrganisme')}
                    </button>
                  </div>

                  {organisationMode === 'existing' ? (
                    <>
                      <div>
                        <label htmlFor="organisme-search" className="label">{t('users.organismeSearch')}</label>
                        <div className="flex gap-2">
                          <input id="organisme-search" type="search" className="input" value={organismeSearch} onChange={(e) => setOrganismeSearch(e.target.value)} placeholder={t('users.organismeSearchPlaceholder')} />
                          <button type="button" onClick={() => loadOrganismes(organismeSearch)} disabled={isLoadingOrganismes} className="btn-outline shrink-0 disabled:cursor-not-allowed disabled:opacity-50">{t('common.refresh')}</button>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="new-user-organisme" className="label">{t('users.organismeExisting')} *</label>
                        <select id="new-user-organisme" required className="select" value={formData.organismeId || ''} onChange={(e) => setFormData({ ...formData, organismeId: e.target.value || undefined })}>
                          <option value="">{isLoadingOrganismes ? t('common.loading') : t('common.selectPlaceholder')}</option>
                          {organismes.map((organisme) => (
                            <option key={organisme.id} value={organisme.id}>{organisme.name} — {t(`organisme.type.${organisme.type}`)}{organisme.sector ? ` — ${organisme.sector}` : ''}</option>
                          ))}
                        </select>
                      </div>
                      {formData.organismeId && (() => {
                        const selected = organismes.find((organisme) => organisme.id === formData.organismeId);
                        return selected ? (
                          <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-slate-800 dark:text-slate-200">
                            <strong>{selected.name}</strong><br />
                            {t(`organisme.type.${selected.type}`)}{selected.sector ? ` · ${selected.sector}` : ''}
                          </div>
                        ) : null;
                      })()}
                      <a href="/admin/organismes" target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-primary-700 hover:underline">{t('users.manageOrganisations')}</a>
                    </>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="new-organisme-name" className="label">{t('requestAccount.companyName')} *</label>
                        <input id="new-organisme-name" required className="input" value={newOrganisme.organisationName || ''} onChange={(e) => setNewOrganisme({ ...newOrganisme, organisationName: e.target.value })} />
                      </div>
                      <div>
                        <label htmlFor="new-organisme-type" className="label">{t('requestAccount.companyType')} *</label>
                        <select id="new-organisme-type" required className="select" value={newOrganisme.organisationType || TypeOrganisme.PRIVE} onChange={(e) => setNewOrganisme({ ...newOrganisme, organisationType: e.target.value as TypeOrganisme })}>
                          <option value={TypeOrganisme.PRIVE}>{t('requestAccount.typePrive')}</option>
                          <option value={TypeOrganisme.PUBLIC}>{t('requestAccount.typePublic')}</option>
                          <option value={TypeOrganisme.SOCIETE_CIVILE}>{t('requestAccount.typeCivil')}</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="new-organisme-sector" className="label">{t('requestAccount.sector')}</label>
                        <select id="new-organisme-sector" className="select" value={newOrganisme.sector || ''} onChange={(e) => setNewOrganisme({ ...newOrganisme, sector: e.target.value, otherSector: e.target.value === 'OTHER' ? newOrganisme.otherSector : '' })}>
                          <option value="">{t('requestAccount.sectorPlaceholder')}</option>
                          {SECTOR_VALUES.map((sector) => <option key={sector} value={sector}>{t(`requestAccount.sectorOptions.${sector}`)}</option>)}
                        </select>
                      </div>
                      {newOrganisme.sector === 'OTHER' && (
                        <div className="sm:col-span-2">
                          <label htmlFor="new-organisme-other-sector" className="label">{t('requestAccount.otherSector')} *</label>
                          <input id="new-organisme-other-sector" required className="input" value={newOrganisme.otherSector || ''} onChange={(e) => setNewOrganisme({ ...newOrganisme, otherSector: e.target.value })} />
                        </div>
                      )}
                      <div>
                        <label htmlFor="new-organisme-email" className="label">{t('common.email')}</label>
                        <input id="new-organisme-email" type="email" className="input" value={newOrganisme.organisationEmail || ''} onChange={(e) => setNewOrganisme({ ...newOrganisme, organisationEmail: e.target.value })} />
                      </div>
                      <div>
                        <label htmlFor="new-organisme-phone" className="label">{t('common.phone')}</label>
                        <input id="new-organisme-phone" type="tel" className="input" value={newOrganisme.organisationPhone || ''} onChange={(e) => setNewOrganisme({ ...newOrganisme, organisationPhone: e.target.value })} />
                      </div>
                      <div>
                        <label htmlFor="new-organisme-fax" className="label">{t('common.fax')}</label>
                        <input id="new-organisme-fax" type="tel" className="input" value={newOrganisme.fax || ''} onChange={(e) => setNewOrganisme({ ...newOrganisme, fax: e.target.value })} />
                      </div>
                      <div>
                        <label htmlFor="new-organisme-website" className="label">{t('settingsPage.website')}</label>
                        <input id="new-organisme-website" type="url" className="input" value={newOrganisme.website || ''} onChange={(e) => setNewOrganisme({ ...newOrganisme, website: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="new-organisme-address" className="label">{t('common.address')}</label>
                        <textarea id="new-organisme-address" rows={2} className="input" value={newOrganisme.address || ''} onChange={(e) => setNewOrganisme({ ...newOrganisme, address: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <span className="label">{t('requestAccount.companyLogo')} *</span>
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-800">
                          <Upload className="mb-2 h-6 w-6 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-slate-200">{t('requestAccount.attachLogo')}</span>
                          <span className="mt-1 text-xs text-gray-500">{t('requestAccount.logoHint', { max: MAX_LOGO_SIZE_MB })}</span>
                          <input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { handleLogoSelected(e.target.files); e.target.value = ''; }} />
                        </label>
                        {newOrganisme.logo && (
                          <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                            <Image className="h-5 w-5 flex-shrink-0 text-primary-600" />
                            <span className="min-w-0 flex-1 truncate">{newOrganisme.logo.name}</span>
                            <span className="flex-shrink-0 text-xs text-gray-400">{formatFileSize(newOrganisme.logo.size)}</span>
                            <button type="button" onClick={() => setNewOrganisme({ ...newOrganisme, logo: undefined })} className="icon-button h-7 w-7 text-red-600" title={t('requestAccount.removeLogoTitle')} aria-label={t('requestAccount.removeLogoTitle')}><X className="h-4 w-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </fieldset>
              )}

              <fieldset className="space-y-4 rounded-lg border border-gray-200 p-4">
                <legend className="px-2 text-sm font-semibold text-gray-900">{t('users.activationSection')}</legend>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="radio" name="activation-mode" value="link" checked={activationMode === 'link'} onChange={() => { setActivationMode('link'); setFormData({ ...formData, password: undefined }); setPasswordConfirmation(''); }} />
                  <span><strong className="block text-sm text-gray-900">{t('users.activationLink')}</strong><span className="text-xs text-gray-500">{t('users.activationLinkHint')}</span></span>
                </label>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="radio" name="activation-mode" value="password" checked={activationMode === 'password'} onChange={() => setActivationMode('password')} />
                  <span><strong className="block text-sm text-gray-900">{t('users.setPasswordNow')}</strong><span className="text-xs text-gray-500">{t('users.setPasswordHint')}</span></span>
                </label>
                {activationMode === 'password' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="new-user-password" className="label">{t('common.password')} *</label>
                      <input id="new-user-password" type="password" required minLength={8} autoComplete="new-password" className="input" value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                    <div>
                      <label htmlFor="new-user-password-confirmation" className="label">{t('users.confirmPassword')} *</label>
                      <input id="new-user-password-confirmation" type="password" required minLength={8} autoComplete="new-password" className="input" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} />
                    </div>
                  </div>
                )}
              </fieldset>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => closeCreateModal()} disabled={isSubmitting} className="btn-outline disabled:cursor-not-allowed disabled:opacity-50">{t('common.cancel')}</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? t('users.creating') : t('common.create')}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Read-only user details */}
      {viewingUser && (
        <UserDetailsDialog
          user={viewingUser}
          logoObjectUrl={viewingUser.organismeLogoUrl ? logoObjectUrls[viewingUser.organismeLogoUrl] : undefined}
          logoHasError={viewingUser.organismeLogoUrl ? failedLogoUrls.has(viewingUser.organismeLogoUrl) : false}
          onLogoPreview={(src, alt) => setLogoPreview({ src, alt })}
          onClose={() => setViewingUser(null)}
          t={t}
        />
      )}
      {logoPreview && (
        <LogoPreviewDialog
          src={logoPreview.src}
          alt={logoPreview.alt}
          closeLabel={t('common.close')}
          onClose={() => setLogoPreview(null)}
        />
      )}
      {confirmationDialog}
    </div>
  );
}

function UserDetailsDialog({
  user,
  logoObjectUrl,
  logoHasError,
  onLogoPreview,
  onClose,
  t,
}: {
  user: User;
  logoObjectUrl?: string;
  logoHasError: boolean;
  onLogoPreview: (src: string, alt: string) => void;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const resolvedStatus = user.status || (user.isActive ? UserStatus.ACTIVE : UserStatus.DISABLED);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/60 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="user-details-title">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl animate-fade-in">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">{t('users.detailTitle')}</p>
            <h2 id="user-details-title" className="mt-1 text-2xl font-bold text-gray-900">{user.fullName}</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-button" title={t('common.close')} aria-label={t('common.close')}><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section>
            <h3 className="mb-3 text-base font-semibold text-gray-900">{t('users.userInformation')}</h3>
            <div className="grid gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-2">
              <Info label={t('users.firstName')} value={user.firstName} />
              <Info label={t('users.lastName')} value={user.lastName} />
              <Info label={t('users.position')} value={user.position || '-'} />
              <Info label={t('users.roleLabel')} value={t(`user.role.${user.role}`)} />
              <Info label={t('common.status')} value={t(`userStatus.${resolvedStatus}`)} />
              <Info label={t('users.createdAt')} value={formatBackendDateTime(user.createdAt)} />
              <Info label={t('users.lastLoginAt')} value={formatBackendDateTime(user.lastLoginAt)} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-base font-semibold text-gray-900">{t('users.organisationInformation')}</h3>
            {user.organismeId ? (
              <div className="grid gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-2">
                <Info label={t('common.name')} value={user.organismeName || '-'} />
                <Info label={t('common.type')} value={user.organismeType ? t(`organisme.type.${user.organismeType}`) : '-'} />
                <Info label={t('common.sector')} value={user.organismeSector || '-'} />
                <Info label={t('common.address')} value={user.organismeAddress || '-'} />
                <Info label={t('common.email')} value={user.organismeEmail || '-'} />
                <Info label={t('common.phone')} value={user.organismePhone || '-'} />
                <Info label={t('common.fax')} value={user.organismeFax || '-'} />
                <Info label={t('settingsPage.website')} value={user.organismeWebsite || '-'} />
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase text-gray-500">{t('common.logo')}</p>
                  <div className="mt-2">
                    <OrganisationLogo
                      logoUrl={user.organismeLogoUrl}
                      objectUrl={logoObjectUrl}
                      hasError={logoHasError}
                      alt={user.organismeName || t('common.logo')}
                      size="large"
                      onPreview={onLogoPreview}
                      previewLabel={t('users.enlargeLogo')}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-gray-200 p-4 text-sm text-gray-500">{t('users.noOrganisation')}</p>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body
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

function OrganisationLogo({
  logoUrl,
  objectUrl,
  hasError,
  alt,
  size = 'small',
  onPreview,
  previewLabel,
}: {
  logoUrl?: string;
  objectUrl?: string;
  hasError: boolean;
  alt: string;
  size?: 'small' | 'large';
  onPreview?: (src: string, alt: string) => void;
  previewLabel?: string;
}) {
  if (!logoUrl || hasError) {
    return <span className="text-gray-400">-</span>;
  }

  const sizeClass = size === 'large' ? 'h-24 w-40 p-3' : 'h-10 w-10 p-1';

  if (!objectUrl) {
    return <div className={`${sizeClass} animate-pulse rounded-md bg-gray-100`} />;
  }

  return (
    <button
      type="button"
      onClick={() => onPreview?.(objectUrl, alt)}
      className={`group relative flex ${sizeClass} cursor-zoom-in items-center justify-center rounded-md border border-gray-200 bg-white transition hover:border-primary-300 hover:shadow-md`}
      title={previewLabel}
      aria-label={previewLabel}
    >
      <img src={objectUrl} alt={alt} className="max-h-full max-w-full object-contain" />
      <span className="absolute inset-0 flex items-center justify-center rounded-md bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/35 group-hover:opacity-100">
        <ZoomIn className="h-5 w-5" />
      </span>
    </button>
  );
}

function LogoPreviewDialog({ src, alt, closeLabel, onClose }: { src: string; alt: string; closeLabel: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute end-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" title={closeLabel} aria-label={closeLabel}>
        <X className="h-6 w-6" />
      </button>
      <img src={src} alt={alt} onClick={(event) => event.stopPropagation()} className="max-h-[86vh] max-w-[92vw] rounded-xl bg-white p-4 object-contain shadow-2xl" />
    </div>,
    document.body,
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function userStatusClass(status: UserStatus | undefined, isActive: boolean) {
  const resolved = resolveUserStatus(status, isActive);
  if (resolved === UserStatus.PENDING_ACTIVATION) return 'bg-amber-100 text-amber-700';
  if (resolved === UserStatus.ACTIVE) return 'bg-green-100 text-green-700';
  return 'bg-red-100 text-red-700';
}

function resolveUserStatus(status: UserStatus | undefined, isActive: boolean) {
  return status || (isActive ? UserStatus.ACTIVE : UserStatus.DISABLED);
}

function accountToggleButtonClass(status: UserStatus | undefined, isActive: boolean) {
  const resolved = resolveUserStatus(status, isActive);
  if (resolved === UserStatus.PENDING_ACTIVATION) {
    return 'cursor-not-allowed text-amber-700 hover:bg-amber-100';
  }
  if (resolved === UserStatus.ACTIVE) {
    return 'text-green-700 hover:bg-green-100';
  }
  return 'text-red-700 hover:bg-red-100';
}

function accountToggleButtonTitle(
  status: UserStatus | undefined,
  isActive: boolean,
  t: (key: string) => string,
) {
  const resolved = resolveUserStatus(status, isActive);
  if (resolved === UserStatus.PENDING_ACTIVATION) return t('users.pendingActivationHint');
  return resolved === UserStatus.ACTIVE ? t('users.disableConfirm') : t('users.enableConfirm');
}
