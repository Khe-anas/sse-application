import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';

export default function ActivateAccountPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      toast.error(t('activation.missingToken'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('activation.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('activation.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.activateAccount({ token, password });
      setIsActivated(true);
      toast.success(t('activation.success'));
    } catch (error) {
      toast.error(t('activation.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full rounded-xl bg-white p-8 shadow-sm">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
            {isActivated ? <CheckCircle2 className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
          </div>

          <h1 className="text-2xl font-bold text-gray-900">{t('activation.title')}</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            {isActivated ? t('activation.doneText') : t('activation.subtitle')}
          </p>

          {isActivated ? (
            <Link to="/login" className="btn-primary mt-6 w-full justify-center">
              {t('activation.goToLogin')}
            </Link>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {!token && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  {t('activation.missingToken')}
                </div>
              )}
              <div>
                <label className="label">{t('activation.password')}</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="label">{t('activation.confirmPassword')}</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? t('activation.activating') : t('activation.submit')}
              </button>
              <Link to="/login" className="block text-center text-sm font-medium text-primary-700 hover:text-primary-800">
                {t('requestAccount.backToLogin')}
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
