import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Building2, Globe2, Languages, Mail, MapPin, Moon, Phone, Send, Settings, Sun, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { organismeService } from '@/services/organismeService';
import { reclamationService } from '@/services/reclamationService';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { changeLanguage, LANGUAGES } from '@/i18n';
import type { Organisme } from '@/types';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { language, theme, toggleThemeForAccount } = useUIStore();
  const [organisme, setOrganisme] = useState<Organisme | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSendingReclamation, setIsSendingReclamation] = useState(false);
  const [contactForm, setContactForm] = useState({
    address: '',
    phone: '',
    email: '',
    website: '',
  });
  const [reclamationForm, setReclamationForm] = useState({
    subject: '',
    message: '',
  });

  useEffect(() => {
    const loadOrganisme = async () => {
      if (!user?.organismeId) return;

      setIsLoading(true);
      try {
        const data = await organismeService.getById(user.organismeId);
        setOrganisme(data);
        setContactForm({
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
        });
      } catch (error) {
        toast.error(t('settingsPage.loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganisme();
  }, [t, user?.organismeId]);

  const handleContactSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.organismeId) return;

    setIsSavingContact(true);
    try {
      const updated = await organismeService.updateContact(user.organismeId, contactForm);
      setOrganisme(updated);
      toast.success(t('settingsPage.contactUpdated'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('settingsPage.contactError')));
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleReclamationSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reclamationForm.subject.trim() || !reclamationForm.message.trim()) {
      toast.error(t('settingsPage.reclamationRequired'));
      return;
    }

    setIsSendingReclamation(true);
    try {
      await reclamationService.submit({
        subject: reclamationForm.subject.trim(),
        message: reclamationForm.message.trim(),
      });
      setReclamationForm({ subject: '', message: '' });
      toast.success(t('settingsPage.reclamationSent'));
    } catch (error) {
      toast.error(getErrorMessage(error, t('settingsPage.reclamationError')));
    } finally {
      setIsSendingReclamation(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('settingsPage.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('settingsPage.subtitle')}</p>
        </div>
        <div className="hidden h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700 sm:flex">
          <Settings className="h-5 w-5" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <section className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase text-primary-700">{t('settingsPage.interfaceTitle')}</p>
              <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-slate-100">{t('settingsPage.interfaceHeading')}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t('settingsPage.interfaceHint')}</p>
            </div>
            <Languages className="h-6 w-6 text-gray-400" />
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <span className="label">{t('settingsPage.language')}</span>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => changeLanguage(item.code)}
                    className={language === item.code ? 'btn-primary justify-center px-3' : 'btn-outline justify-center px-3'}
                    aria-pressed={language === item.code}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">{t('settingsPage.appearance')}</span>
              <button type="button" onClick={() => user && toggleThemeForAccount(user.id)} className="btn-outline w-full justify-between gap-3">
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  {theme === 'dark' ? t('settingsPage.darkMode') : t('settingsPage.lightMode')}
                </span>
                <span className="text-xs text-gray-500">{t('settingsPage.change')}</span>
              </button>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-50 p-2 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"><UserRound className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">{t('settingsPage.currentAccount')}</p>
              <h2 className="truncate text-lg font-bold text-gray-900 dark:text-slate-100">{user?.fullName || '-'}</h2>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div><dt className="text-gray-500">{t('common.email')}</dt><dd className="break-all font-medium text-gray-900 dark:text-slate-100">{user?.email || '-'}</dd></div>
            <div><dt className="text-gray-500">{t('common.role')}</dt><dd className="font-medium text-gray-900 dark:text-slate-100">{user?.role ? t(`user.role.${user.role}`) : '-'}</dd></div>
          </dl>
        </section>
      </div>

      {!user?.organismeId ? (
        <div className="card p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('settingsPage.noOrganismeTitle')}</h2>
              <p className="mt-1 text-sm text-gray-500">{t('settingsPage.noOrganismeDesc')}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase text-primary-700">{t('settingsPage.organismeInfo')}</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  {isLoading ? t('common.loading') : organisme?.name || '-'}
                </h2>
              </div>
              <Building2 className="h-6 w-6 text-gray-400" />
            </div>

            <form onSubmit={handleContactSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label">{t('common.address')}</label>
                <div className="relative">
                  <MapPin className="absolute start-3 top-3 h-4 w-4 text-gray-400" />
                  <textarea
                    rows={3}
                    className="input ps-10"
                    value={contactForm.address}
                    onChange={(event) => setContactForm({ ...contactForm, address: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">{t('common.phone')}</label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      className="input ps-10"
                      value={contactForm.phone}
                      onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">{t('common.email')}</label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      className="input ps-10"
                      value={contactForm.email}
                      onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="label">{t('settingsPage.website')}</label>
                <div className="relative">
                  <Globe2 className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    className="input ps-10"
                    value={contactForm.website}
                    onChange={(event) => setContactForm({ ...contactForm, website: event.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary gap-2 disabled:opacity-50" disabled={isSavingContact}>
                  <Settings className="h-4 w-4" />
                  {isSavingContact ? t('settingsPage.saving') : t('common.save')}
                </button>
              </div>
            </form>
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase text-primary-700">{t('settingsPage.reclamationTitle')}</p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">{t('settingsPage.reclamationHeading')}</h2>
              </div>
              <Send className="h-6 w-6 text-gray-400" />
            </div>

            <form onSubmit={handleReclamationSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label">{t('settingsPage.subject')}</label>
                <input
                  type="text"
                  className="input"
                  value={reclamationForm.subject}
                  onChange={(event) => setReclamationForm({ ...reclamationForm, subject: event.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('common.message')}</label>
                <textarea
                  rows={8}
                  className="input"
                  value={reclamationForm.message}
                  onChange={(event) => setReclamationForm({ ...reclamationForm, message: event.target.value })}
                />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit" className="btn-primary gap-2 disabled:opacity-50" disabled={isSendingReclamation}>
                  <Send className="h-4 w-4" />
                  {isSendingReclamation ? t('settingsPage.sending') : t('settingsPage.sendReclamation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || fallback;
  }
  return fallback;
}
