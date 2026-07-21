import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  Sun,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { authService } from '@/services/authService';
import type { LoginRequest } from '@/types';
import BrandLogo from '@/components/branding/BrandLogo';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error(t('authPage.fillAllFields'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login(formData);
      login(response.user, response.accessToken, response.refreshToken);
      toast.success(t('authPage.loginSuccess'));
      navigate('/');
    } catch {
      toast.error(t('auth.loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'admin@sse.tn', role: t('authPage.demoAdmin') },
    { email: 'user@sse.tn', role: t('authPage.demoResp') },
    { email: 'evaluateur@sse.tn', role: t('authPage.demoEvaluateure') },
    { email: 'gouv@sse.tn', role: t('authPage.demoGouv') },
  ];

  return (
    <main className="min-h-[100svh] bg-[#f5f7f6] text-gray-900 transition-colors duration-300 dark:bg-[#101714] dark:text-[#e0e7e3] lg:grid lg:h-[100svh] lg:min-h-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(460px,0.95fr)] lg:overflow-hidden">
      <section className="relative hidden h-full min-h-0 overflow-hidden bg-primary-950 px-12 py-8 text-white dark:bg-[#121b18] lg:flex lg:flex-col xl:px-16 xl:py-10">
        <div className="absolute inset-y-0 right-0 w-px bg-secondary-300/60" />
        <div className="absolute bottom-0 right-0 h-48 w-48 border-l border-t border-white/10" />
        <div className="absolute bottom-12 right-12 h-24 w-24 border border-secondary-300/30" />

        <div className="relative flex items-center gap-4">
          <BrandLogo className="h-16 w-16 flex-shrink-0 rounded-md border border-white/20 shadow-lg shadow-black/20" />
          <div>
            <p className="text-xl font-bold leading-none">{t('app.name')}</p>
            <p className="mt-1 text-sm text-primary-200">CNI</p>
          </div>
        </div>

        <div className="relative my-auto max-w-xl py-6">
          <div className="mb-5 h-1 w-14 bg-secondary-400" />
          <h1 className="max-w-lg text-4xl font-semibold leading-tight">
            {t('app.fullName')}
          </h1>
          <p className="mt-4 max-w-md text-lg leading-7 text-primary-200">
            {t('app.tagline')}
          </p>
        </div>

        <div className="relative flex items-end justify-between gap-8 border-t border-white/10 pt-4">
          <p className="text-sm text-primary-300">{t('authPage.footer')}</p>
          <p className="text-right text-xs uppercase text-primary-300">Plateforme institutionnelle</p>
        </div>
      </section>

      <section className="relative flex min-h-[100svh] flex-col px-5 py-3 sm:px-8 lg:h-full lg:min-h-0 lg:px-10 lg:py-4 xl:px-14">
        <div className="flex items-center justify-between lg:absolute lg:right-6 lg:top-4 lg:z-10">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandLogo className="h-12 w-12 flex-shrink-0 rounded-md border border-gray-200 shadow-sm dark:border-[#2b3b35]" />
            <div>
              <p className="font-bold leading-none">{t('app.name')}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-[#8e9d96]">CNI</p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 dark:border-[#2b3b35] dark:bg-[#17201d] dark:text-[#bac6c0] dark:hover:bg-[#1e2925]"
            title={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
            aria-label={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <div className="mx-auto my-auto w-full max-w-[440px] py-2">
          <div className="mb-5">
            <p className="mb-1 text-sm font-semibold text-primary-700 dark:text-[#8eb7aa]">
              {t('app.fullName')}
            </p>
            <h2 className="text-3xl font-semibold text-gray-900 dark:text-[#e0e7e3]">
              {t('auth.login')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-[#8e9d96]">
              {t('app.tagline')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="label">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#718079]" />
                <input
                  id="login-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input h-11 pl-10"
                  placeholder="nom@organisation.tn"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="label">{t('auth.password')}</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-[#718079]" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input h-11 px-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-[#8e9d96] dark:hover:bg-[#222f2a] dark:hover:text-[#d7e0dc]"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 dark:text-[#aab7b1]">
                <input type="checkbox" className="rounded border-gray-300 text-primary-700 focus:ring-primary-500 dark:border-[#3a4a44] dark:bg-[#17201d]" />
                <span>{t('authPage.rememberMe')}</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm font-medium text-primary-700 transition-colors hover:text-primary-900 dark:text-[#8eb7aa] dark:hover:text-[#b7d0c8]"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary h-11 w-full gap-2 text-base shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {t('authPage.loginInProgress')}
                </>
              ) : (
                <>
                  {t('auth.loginButton')}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 border-t border-gray-200 pt-4 dark:border-[#2b3b35]">
            <div className="flex items-start gap-3">
              <UserPlus className="mt-0.5 h-5 w-5 flex-shrink-0 text-secondary-600 dark:text-[#d5b56c]" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-[#d7e0dc]">
                  {t('authPage.representCompany')}
                </p>
                <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-[#8e9d96]">
                  {t('authPage.representCompanyDesc')}
                </p>
                <Link
                  to="/request-account"
                  className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-900 dark:text-[#8eb7aa] dark:hover:text-[#b7d0c8]"
                >
                  {t('authPage.requestAccountLink')}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase text-gray-400 dark:text-[#718079]">
              {t('authPage.demoAccounts')}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => setFormData({ email: account.email, password: 'password' })}
                  className="min-h-9 break-words rounded-md border border-gray-200 bg-white px-1 py-1.5 text-[10px] font-medium leading-3 text-gray-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800 dark:border-[#2b3b35] dark:bg-[#17201d] dark:text-[#aab7b1] dark:hover:border-[#58756a] dark:hover:bg-[#1e2925] dark:hover:text-[#d7e0dc] sm:px-2 sm:text-xs sm:leading-4"
                >
                  {account.role}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-gray-400 dark:text-[#718079] lg:hidden">
          {t('authPage.footer')}
        </p>
      </section>
    </main>
  );
}
