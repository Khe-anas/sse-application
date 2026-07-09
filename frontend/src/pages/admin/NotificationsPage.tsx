import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Mail, Megaphone, Search, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { notificationService } from '@/services/notificationService';
import { userService } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import { Role, type User } from '@/types';

type Mode = 'announcement' | 'message';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === Role.ADMIN;
  const [mode, setMode] = useState<Mode>('announcement');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([Role.ADMIN, Role.USER, Role.GOUVERNEMENT]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [titleFr, setTitleFr] = useState('');
  const [messageFr, setMessageFr] = useState('');
  const [link, setLink] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(isAdmin);

  const roleOptions = useMemo(() => [
    { role: Role.ADMIN, label: t('notificationsPage.roleAdmins') },
    { role: Role.USER, label: t('notificationsPage.roleResponsables') },
    { role: Role.GOUVERNEMENT, label: t('notificationsPage.roleGouvernement') },
  ], [t]);

  useEffect(() => {
    if (!isAdmin) { setIsLoadingUsers(false); return; }
    const loadUsers = async () => {
      try {
        const data = await userService.getAll({ size: 100 });
        setUsers(data.content);
      } catch (error) {
        toast.error(t('notificationsPage.loadUsersError'));
      } finally {
        setIsLoadingUsers(false);
      }
    };
    loadUsers();
  }, [t, isAdmin]);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return users;

    return users.filter((user) =>
      user.fullName.toLowerCase().includes(value)
      || user.email.toLowerCase().includes(value)
      || t(`user.role.${user.role}`).toLowerCase().includes(value)
    );
  }, [search, t, users]);

  const toggleRole = (role: Role) => {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    );
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const resetForm = () => {
    setTitleFr('');
    setMessageFr('');
    setLink('');
    setSelectedUserIds([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === 'message' && selectedUserIds.length === 0) {
      toast.error(t('notificationsPage.selectRecipient'));
      return;
    }

    if (mode === 'announcement' && selectedRoles.length === 0) {
      toast.error(t('notificationsPage.selectRole'));
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        titleFr: titleFr.trim(),
        messageFr: messageFr.trim(),
        link: link.trim() || undefined,
      };

      const sent = mode === 'announcement'
        ? await notificationService.sendAnnouncement({ ...payload, roles: selectedRoles })
        : await notificationService.sendMessage({ ...payload, recipientUserIds: selectedUserIds });

      toast.success(t('notificationsPage.sent', { count: sent }));
      resetForm();
    } catch (error) {
      toast.error(t('notificationsPage.sendError'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('navigation.notifications')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('notificationsPage.subtitle')}</p>
        </div>
        <div className="h-11 w-11 rounded-lg bg-primary-700 text-white flex items-center justify-center">
          <Bell className="w-5 h-5" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="card p-5 space-y-5">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setMode('announcement')}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                mode === 'announcement' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              {t('notificationsPage.modeAnnouncement')}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setMode('message')}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  mode === 'message' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="w-4 h-4" />
                {t('notificationsPage.modeMessage')}
              </button>
            )}
          </div>

          {mode === 'announcement' ? (
            <div>
              <label className="label">{t('notificationsPage.recipients')}</label>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((option) => {
                  const selected = selectedRoles.includes(option.role);
                  return (
                    <button
                      key={option.role}
                      type="button"
                      onClick={() => toggleRole(option.role)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        selected ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`h-4 w-4 rounded border flex items-center justify-center ${
                        selected ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300'
                      }`}>
                        {selected && <Check className="w-3 h-3" />}
                      </span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <label className="label">{t('notificationsPage.recipientsSelected')}</label>
              <p className="text-sm text-gray-500">{t('notificationsPage.recipientsCount', { count: selectedUserIds.length })}</p>
            </div>
          )}

          <div>
            <label className="label">{t('notificationsPage.titleLabel')} *</label>
            <input
              required
              className="input"
              value={titleFr}
              onChange={(event) => setTitleFr(event.target.value)}
              placeholder={mode === 'announcement' ? t('notificationsPage.titlePlaceholderAnnouncement') : t('notificationsPage.titlePlaceholderMessage')}
            />
          </div>

          <div>
            <label className="label">{t('notificationsPage.messageLabel')} *</label>
            <textarea
              required
              className="input min-h-36 resize-y"
              maxLength={2000}
              value={messageFr}
              onChange={(event) => setMessageFr(event.target.value)}
              placeholder={t('notificationsPage.messagePlaceholder')}
            />
            <p className="mt-1 text-xs text-gray-400">{messageFr.length}/2000</p>
          </div>

          <div>
            <label className="label">{t('notificationsPage.internalLink')}</label>
            <input
              className="input"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="/user/dashboard"
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={isSending} className="btn-primary gap-2 disabled:opacity-60">
              <Send className="w-4 h-4" />
              {isSending ? t('notificationsPage.sending') : t('notificationsPage.send')}
            </button>
          </div>
        </form>

        {isAdmin ? (
          <aside className="card p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{t('notificationsPage.usersTitle')}</h2>
              <p className="text-xs text-gray-500">{t('notificationsPage.usersSubtitle')}</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('notificationsPage.searchPlaceholder')} />
            </div>
            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">
              {isLoadingUsers ? (
                <p className="text-sm text-gray-500 py-6 text-center">{t('common.loading')}</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">{t('notificationsPage.empty')}</p>
              ) : (
                filteredUsers.map((u) => {
                  const selected = selectedUserIds.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleUser(u.id)}
                      className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left ${selected ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <span className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300'}`}>
                        {selected && <Check className="w-3 h-3" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900 truncate">{u.fullName}</span>
                        <span className="block text-xs text-gray-500 truncate">{u.email}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        ) : (
          <aside className="card p-4 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">{t('notificationsPage.adminOnly')}</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
