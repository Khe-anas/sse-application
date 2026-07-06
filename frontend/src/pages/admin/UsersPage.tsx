import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { userService, type CreateUserRequest } from '@/services/userService';
import { organismeService } from '@/services/organismeService';
import { Role, UserStatus } from '@/types';
import type { User, PageResponse, Organisme } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import KPICard from '@/components/dashboard/KPICard';
import { Users } from 'lucide-react';

export default function UsersPage() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<PageResponse<User> | null>(null);
  const [organismes, setOrganismes] = useState<Organisme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newEntrepriseName, setNewEntrepriseName] = useState('');
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '', firstName: '', lastName: '', role: Role.ADMIN,
  });

  const emptyForm: CreateUserRequest = {
    email: '',
    firstName: '',
    lastName: '',
    role: Role.ADMIN,
  };

  const loadUsers = useCallback(async () => {
    try {
      const [usersData, organismesData] = await Promise.all([
        userService.getAll({ search: search || undefined, role: (roleFilter as any) || undefined }),
        organismeService.getAll({ size: 100 }),
      ]);
      setUsers(usersData);
      setOrganismes(organismesData.content);
    } catch (error) {
      toast.error(t('users.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CreateUserRequest = {
      email: formData.email.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      role: formData.role,
    };

    const phone = formData.phone?.trim();
    const password = formData.password?.trim();
    const entrepriseName = newEntrepriseName.trim();

    if (phone) payload.phone = phone;
    if (password) payload.password = password;

    try {
      if (formData.role === Role.RESPONSABLE) {
        if (entrepriseName && !editingUser) {
          payload.entrepriseName = entrepriseName;
        } else {
          payload.organismeId = formData.organismeId;
        }
      }

      if (editingUser) {
        await userService.update(editingUser.id, payload);
        toast.success(t('users.updated'));
      } else {
        await userService.create(payload);
        toast.success(t('users.created'));
      }
      setShowModal(false);
      setEditingUser(null);
      setNewEntrepriseName('');
      setFormData(emptyForm);
      loadUsers();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error || t('users.operationError')
        : t('users.operationError');
      toast.error(message);
    }
  };

  const handleToggleActive = async (user: User) => {
    const newActive = !user.isActive;
    const msg = newActive ? t('users.enableConfirm') : t('users.disableConfirm');
    if (!confirm(msg)) return;
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
    if (!confirm(t('users.deleteConfirm'))) return;
    try {
      await userService.delete(id);
      toast.success(t('users.deleted'));
      loadUsers();
    } catch (error) {
      toast.error(t('users.deleteError'));
    }
  };

  const handleGeneratePassword = async (id: string) => {
    if (!confirm(t('users.generatePasswordConfirm'))) return;
    try {
      await userService.generatePassword(id);
      toast.success(t('users.generatePasswordSuccess'));
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error || t('users.operationError')
        : t('users.operationError');
      toast.error(message);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      organismeId: user.organismeId,
    });
    setNewEntrepriseName('');
    setShowModal(true);
  };

  const handleRoleChange = (role: Role) => {
    if (role !== Role.RESPONSABLE) {
      setNewEntrepriseName('');
    }

    setFormData({
      ...formData,
      role,
      organismeId: role === Role.RESPONSABLE ? formData.organismeId : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('navigation.users')}</h1>
        <button
          onClick={() => { setEditingUser(null); setNewEntrepriseName(''); setFormData(emptyForm); setShowModal(true); }}
          className="btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('users.new')}
        </button>
      </div>

      <KPICard title={t('users.total')} value={users?.totalElements || 0} icon={Users} color="primary" />

      {/* Search */}
      <div className="card p-4">
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
              <option value={Role.SUPER_ADMIN}>{t('user.role.SUPER_ADMIN')}</option>
              <option value={Role.ADMIN}>{t('user.role.ADMIN')}</option>
              <option value={Role.RESPONSABLE}>{t('user.role.RESPONSABLE')}</option>
              <option value={Role.GOUVERNEMENT}>{t('user.role.GOUVERNEMENT')}</option>
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
              <th className="table-th">{t('common.status')}</th>
              <th className="table-th">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="table-td text-center py-8">{t('common.loading')}</td>
              </tr>
            ) : users?.content.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-td text-center py-8 text-gray-500">{t('users.empty')}</td>
              </tr>
            ) : (
              users?.content.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{user.fullName}</td>
                  <td className="table-td text-gray-500">{user.email}</td>
                  <td className="table-td">
                    <span className={`badge ${
                      user.role === Role.SUPER_ADMIN ? 'bg-red-100 text-red-700' :
                      user.role === Role.ADMIN ? 'bg-purple-100 text-purple-700' :
                      user.role === Role.GOUVERNEMENT ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {t(`user.role.${user.role}`)}
                    </span>
                  </td>
                  <td className="table-td text-gray-500">{user.organismeName || '-'}</td>
                  <td className="table-td">
                    <span className={`badge ${userStatusClass(user.status, user.isActive)}`}>
                      {t(`userStatus.${user.status || (user.isActive ? UserStatus.ACTIVE : UserStatus.DISABLED)}`)}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(user)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {user.role !== Role.SUPER_ADMIN && (
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`p-1.5 rounded-lg ${
                            user.isActive
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={user.isActive ? t('users.disableConfirm') : t('users.enableConfirm')}
                        >
                          {user.isActive ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                        </button>
                      )}
                      {user.role !== Role.SUPER_ADMIN && (
                        <button
                          onClick={() => handleGeneratePassword(user.id)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
                          title={t('users.generatePassword')}
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(user.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50">
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4">{editingUser ? t('users.editTitle') : t('users.createTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">{t('common.email')} *</label>
                <input type="email" required className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('users.firstName')} *</label>
                  <input type="text" required className="input" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('users.lastName')} *</label>
                  <input type="text" required className="input" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">{t('users.roleLabel')} *</label>
                <select className="select" value={formData.role} onChange={(e) => handleRoleChange(e.target.value as Role)}>
                  {isSuperAdmin && <option value={Role.SUPER_ADMIN}>{t('user.role.SUPER_ADMIN')}</option>}
                  <option value={Role.ADMIN}>{t('user.role.ADMIN')}</option>
                  <option value={Role.RESPONSABLE}>{t('user.role.RESPONSABLE')}</option>
                  <option value={Role.GOUVERNEMENT}>{t('user.role.GOUVERNEMENT')}</option>
                </select>
              </div>
              {formData.role === Role.RESPONSABLE && (
                <div className="space-y-3">
                  <div>
                    <label className="label">{t('users.organismeExisting')}</label>
                    <select
                      required={!newEntrepriseName.trim()}
                      className="select"
                      value={formData.organismeId || ''}
                      onChange={(e) => setFormData({ ...formData, organismeId: e.target.value })}
                      disabled={!!newEntrepriseName.trim()}
                    >
                      <option value="">{t('common.selectPlaceholder')}</option>
                      {organismes.map((organisme) => (
                        <option key={organisme.id} value={organisme.id}>{organisme.name}</option>
                      ))}
                    </select>
                  </div>
                  {!editingUser && (
                    <div>
                      <label className="label">{t('users.newEntreprise')}</label>
                      <input
                        type="text"
                        className="input"
                        value={newEntrepriseName}
                        onChange={(e) => {
                          setNewEntrepriseName(e.target.value);
                          setFormData({ ...formData, organismeId: undefined });
                        }}
                        placeholder={t('users.newEntreprisePlaceholder')}
                      />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="label">{t('common.phone')}</label>
                <input type="tel" className="input" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">
                  {editingUser ? t('users.newPassword') : t('common.password')}
                </label>
                <input
                  type="password"
                  className="input"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? t('users.passwordEditPlaceholder') : t('users.passwordCreatePlaceholder')}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">{t('common.cancel')}</button>
                <button type="submit" className="btn-primary">{editingUser ? t('users.update') : t('common.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function userStatusClass(status: UserStatus | undefined, isActive: boolean) {
  const resolved = status || (isActive ? UserStatus.ACTIVE : UserStatus.DISABLED);
  if (resolved === UserStatus.PENDING_ACTIVATION) return 'bg-amber-100 text-amber-700';
  if (resolved === UserStatus.ACTIVE) return 'bg-green-100 text-green-700';
  return 'bg-red-100 text-red-700';
}
