import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Eye, EyeOff, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import type { LoginRequest } from '@/types';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuthStore();
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
    } catch (error) {
      toast.error(t('auth.loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-secondary-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('app.name')}</h1>
          <p className="text-primary-200">{t('app.fullName')}</p>
          <p className="text-primary-300 text-sm mt-1">{t('app.tagline')}</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {t('auth.login')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="admin@sse.tn"
                required
              />
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-primary-700 focus:ring-primary-500" />
                <span className="text-sm text-gray-600">{t('authPage.rememberMe')}</span>
              </label>
              <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm text-primary-700 hover:text-primary-800 font-medium">
                {t('auth.forgotPassword')}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('authPage.loginInProgress')}
                </span>
              ) : (
                t('auth.loginButton')
              )}
            </button>
          </form>

          <div className="mt-5 rounded-xl border border-primary-100 bg-primary-50 p-4">
            <p className="text-sm font-medium text-gray-900">{t('authPage.representCompany')}</p>
            <p className="mt-1 text-xs leading-5 text-gray-600">
              {t('authPage.representCompanyDesc')}
            </p>
            <Link
              to="/request-account"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
            >
              <UserPlus className="h-4 w-4" />
              {t('authPage.requestAccountLink')}
            </Link>
          </div>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center mb-3">{t('authPage.demoAccounts')}</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { email: 'admin@sse.tn', role: 'Admin' },
                { email: 'user@sse.tn', role: t('authPage.demoResp') },
                { email: 'evaluateur@sse.tn', role: t('authPage.demoEvaluateure') },
                { email: 'gouv@sse.tn', role: t('authPage.demoGouv') },
              ].map((account) => (
                <button
                  key={account.email}
                  onClick={() => setFormData({ email: account.email, password: 'password' })}
                  className="text-xs p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {account.role}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-primary-300 text-sm mt-6">
          {t('authPage.footer')}
        </p>
      </div>
    </div>
  );
}
