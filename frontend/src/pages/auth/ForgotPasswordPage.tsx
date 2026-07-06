import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, ArrowLeft, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t('authPage.fillAllFields'));
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setIsSent(true);
    } catch {
      toast.error(t('forgotPassword.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-secondary-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('app.name')}</h1>
          <p className="text-primary-200">{t('app.fullName')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {isSent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MailCheck className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('forgotPassword.sentTitle')}</h2>
              <p className="text-sm text-gray-500 mb-6">{t('forgotPassword.sentMessage')}</p>
              <Link to="/login" className="btn-primary w-full justify-center">
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                {t('forgotPassword.title')}
              </h2>
              <p className="text-sm text-gray-500 mb-6 text-center">
                {t('forgotPassword.subtitle')}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="label">{t('auth.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('forgotPassword.sending')}
                    </span>
                  ) : (
                    t('forgotPassword.submit')
                  )}
                </button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('forgotPassword.backToLogin')}
                </Link>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-primary-300 text-sm mt-6">
          {t('authPage.footer')}
        </p>
      </div>
    </div>
  );
}
