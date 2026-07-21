import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Image,
  Send,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { accountRequestService, type AccountRequestSubmitForm } from '@/services/accountRequestService';
import { TypeOrganisme } from '@/types';
import BrandLogo from '@/components/branding/BrandLogo';

const MAX_LOGO_SIZE_MB = 5;
const MAX_LOGO_SIZE = MAX_LOGO_SIZE_MB * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const SECTOR_VALUES = [
  'AGRICULTURE',
  'INDUSTRY',
  'ENERGY',
  'CONSTRUCTION',
  'COMMERCE',
  'TRANSPORT',
  'TECHNOLOGY',
  'FINANCE',
  'HEALTH',
  'EDUCATION',
  'TOURISM',
  'PUBLIC_ADMINISTRATION',
  'SERVICES',
  'CIVIL_SOCIETY',
  'OTHER',
] as const;

const emptyForm: AccountRequestSubmitForm = {
  companyName: '',
  type: TypeOrganisme.PRIVE,
  responsibleFirstName: '',
  responsibleLastName: '',
  companyEmail: '',
  phone: '',
  fax: '',
  address: '',
  sector: '',
  otherSector: '',
  companyRole: '',
  position: '',
};

const PHONE_REGEX = /^\+216\d{8}$/;

const extractPhoneDigits = (value: string) => value.replace(/^\+216/, '').replace(/[\s-]/g, '').replace(/\D/g, '').slice(0, 8);

export default function AccountRequestPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AccountRequestSubmitForm>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const typeOptions = [
    { value: TypeOrganisme.PRIVE, label: t('requestAccount.typePrive') },
    { value: TypeOrganisme.PUBLIC, label: t('requestAccount.typePublic') },
    { value: TypeOrganisme.SOCIETE_CIVILE, label: t('requestAccount.typeCivil') },
  ];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (
      !formData.companyName.trim()
      || !formData.responsibleFirstName.trim()
      || !formData.responsibleLastName.trim()
      || !formData.companyEmail.trim()
      || !formData.companyRole.trim()
      || !formData.position.trim()
    ) {
      toast.error(t('requestAccount.toastRequired'));
      return;
    }
    if (!formData.logo) {
      toast.error(t('requestAccount.toastNeedLogo'));
      return;
    }
    if (formData.sector === 'OTHER' && !formData.otherSector?.trim()) {
      toast.error(t('requestAccount.toastNeedOtherSector'));
      return;
    }

    setIsSubmitting(true);
    try {
      await accountRequestService.submit({
        ...formData,
        companyName: formData.companyName.trim(),
        responsibleFirstName: formData.responsibleFirstName.trim(),
        responsibleLastName: formData.responsibleLastName.trim(),
        companyEmail: formData.companyEmail.trim(),
        phone: formData.phone?.trim() ? `+216${extractPhoneDigits(formData.phone)}` : undefined,
        fax: formData.fax?.trim(),
        address: formData.address?.trim(),
        sector: formData.sector?.trim(),
        otherSector: formData.sector === 'OTHER' ? formData.otherSector?.trim() : undefined,
        companyRole: formData.companyRole.trim(),
        position: formData.position.trim(),
      });
      setSubmitted(true);
      setFormData(emptyForm);
      toast.success(t('requestAccount.toastSubmitted'));
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.error || t('requestAccount.toastSubmitError')
        : t('requestAccount.toastSubmitError');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
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

    setFormData((current) => ({ ...current, logo }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="hidden rounded-2xl border border-white/10 bg-white/10 p-8 text-white shadow-xl backdrop-blur lg:block">
            <BrandLogo className="mb-8 h-20 w-20 rounded-md border border-white/20 shadow-lg" />
            <h1 className="text-3xl font-bold leading-tight">{t('requestAccount.asideTitle')}</h1>
            <p className="mt-4 text-sm leading-6 text-primary-100">{t('requestAccount.asideDesc')}</p>
            <div className="mt-8 space-y-4 text-sm text-primary-100">
              <div className="flex gap-3">
                <Building2 className="mt-0.5 h-5 w-5 text-secondary-300" />
                <span>{t('requestAccount.asideCompany')}</span>
              </div>
              <div className="flex gap-3">
                <UserRound className="mt-0.5 h-5 w-5 text-secondary-300" />
                <span>{t('requestAccount.asideResponsible')}</span>
              </div>
              <div className="flex gap-3">
                <Briefcase className="mt-0.5 h-5 w-5 text-secondary-300" />
                <span>{t('requestAccount.asideRole')}</span>
              </div>
              <div className="flex gap-3">
                <Image className="mt-0.5 h-5 w-5 text-secondary-300" />
                <span>{t('requestAccount.asideLogo')}</span>
              </div>
            </div>
          </aside>

          <main className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800">
              <ArrowLeft className="h-4 w-4" />
              {t('requestAccount.backToLogin')}
            </Link>

            {submitted ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('requestAccount.submittedTitle')}</h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-gray-600">{t('requestAccount.submittedDesc')}</p>
                <button onClick={() => setSubmitted(false)} className="btn-primary mt-6">
                  {t('requestAccount.submitAnother')}
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-sm font-medium uppercase text-primary-700">{t('requestAccount.newAccount')}</p>
                  <h2 className="mt-1 text-2xl font-bold text-gray-900">{t('requestAccount.formTitle')}</h2>
                  <p className="mt-2 text-sm text-gray-500">{t('requestAccount.requiredFields')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="label">{t('requestAccount.companyName')} *</label>
                      <input required className="input" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} placeholder={t('requestAccount.companyNamePlaceholder')} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">{t('requestAccount.companyType')} *</label>
                      <select required className="select" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as TypeOrganisme })}>
                        {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">{t('requestAccount.responsibleFirst')} *</label>
                      <input required className="input" value={formData.responsibleFirstName} onChange={(e) => setFormData({ ...formData, responsibleFirstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">{t('requestAccount.responsibleLast')} *</label>
                      <input required className="input" value={formData.responsibleLastName} onChange={(e) => setFormData({ ...formData, responsibleLastName: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">{t('requestAccount.companyRole')} *</label>
                      <input required className="input" value={formData.companyRole} onChange={(e) => setFormData({ ...formData, companyRole: e.target.value })} placeholder={t('requestAccount.companyRolePlaceholder')} />
                    </div>
                    <div>
                      <label className="label">{t('requestAccount.position')} *</label>
                      <input required className="input" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} placeholder={t('requestAccount.positionPlaceholder')} />
                    </div>
                    <div>
                      <label className="label">{t('requestAccount.companyEmail')} *</label>
                      <input required type="email" className="input" value={formData.companyEmail} onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })} placeholder={t('requestAccount.companyEmailPlaceholder')} />
                    </div>
                    <div>
                      <label className="label">{t('requestAccount.phone')}</label>
                      <div className="flex">
                        <span className="inline-flex items-center rounded-s-lg border border-e-0 border-gray-300 bg-gray-100 px-3 text-sm font-medium text-gray-600">
                          +216
                        </span>
                        <input
                          type="tel"
                          className="input rounded-l-none"
                          value={formData.phone ? formData.phone.replace(/^\+216/, '') : ''}
                          onChange={(e) => setFormData({ ...formData, phone: extractPhoneDigits(e.target.value) })}
                          placeholder="22 345 678"
                          inputMode="numeric"
                        />
                      </div>
                      {formData.phone && !PHONE_REGEX.test(`+216${extractPhoneDigits(formData.phone)}`) && (
                        <p className="mt-1 text-xs text-red-600">{t('requestAccount.phoneHint')}</p>
                      )}
                    </div>
                    <div>
                      <label className="label">{t('requestAccount.fax')}</label>
                      <input type="tel" className="input" value={formData.fax} onChange={(e) => setFormData({ ...formData, fax: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">{t('requestAccount.address')}</label>
                      <input className="input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">{t('requestAccount.sector')}</label>
                      <select className="select" value={formData.sector} onChange={(e) => setFormData({ ...formData, sector: e.target.value, otherSector: e.target.value === 'OTHER' ? formData.otherSector : '' })}>
                        <option value="">{t('requestAccount.sectorPlaceholder')}</option>
                        {SECTOR_VALUES.map((sector) => (
                          <option key={sector} value={sector}>{t(`requestAccount.sectorOptions.${sector}`)}</option>
                        ))}
                      </select>
                    </div>
                    {formData.sector === 'OTHER' && (
                      <div className="md:col-span-2">
                        <label className="label">{t('requestAccount.otherSector')} *</label>
                        <input
                          className="input"
                          value={formData.otherSector || ''}
                          onChange={(e) => setFormData({ ...formData, otherSector: e.target.value })}
                          placeholder={t('requestAccount.otherSectorPlaceholder')}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="label">{t('requestAccount.companyLogo')} *</label>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:bg-gray-100">
                      <Upload className="mb-2 h-6 w-6 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{t('requestAccount.attachLogo')}</span>
                      <span className="mt-1 text-xs text-gray-500">{t('requestAccount.logoHint', { max: MAX_LOGO_SIZE_MB })}</span>
                      <input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { handleLogoSelected(e.target.files); e.target.value = ''; }} />
                    </label>
                    {formData.logo && (
                      <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                        <Image className="h-5 w-5 flex-shrink-0 text-primary-600" />
                        <span className="min-w-0 flex-1 truncate">{formData.logo.name}</span>
                        <span className="flex-shrink-0 text-xs text-gray-400">{formatFileSize(formData.logo.size)}</span>
                        <button type="button" onClick={() => setFormData((current) => ({ ...current, logo: undefined }))} className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center text-red-600 hover:bg-red-50" title={t('requestAccount.removeLogoTitle')}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={isSubmitting} className="btn-primary w-full gap-2 py-3 text-base disabled:cursor-not-allowed disabled:opacity-50">
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {t('requestAccount.submitting')}
                      </span>
                    ) : (
                      <><Send className="h-5 w-5" />{t('requestAccount.submit')}</>
                    )}
                  </button>
                </form>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
