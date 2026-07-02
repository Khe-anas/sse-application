import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Building2, CheckCircle2, FileCheck2, Send, Upload, UserRound, X } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { accountRequestService, type AccountRequestSubmitForm } from '@/services/accountRequestService';
import { TypeOrganisme } from '@/types';

const MAX_VERIFICATION_FILES = 5;
const MAX_PDF_FILE_SIZE_MB = 25;
const MAX_TOTAL_PDF_SIZE_MB = 125;
const MAX_PDF_FILE_SIZE = MAX_PDF_FILE_SIZE_MB * 1024 * 1024;
const MAX_TOTAL_PDF_SIZE = MAX_TOTAL_PDF_SIZE_MB * 1024 * 1024;

const emptyForm: AccountRequestSubmitForm = {
  companyName: '',
  type: TypeOrganisme.PRIVE,
  responsibleFirstName: '',
  responsibleLastName: '',
  companyEmail: '',
  phone: '',
  address: '',
  sector: '',
  message: '',
  verificationFiles: [],
};

export default function AccountRequestPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<AccountRequestSubmitForm>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const selectedFiles = formData.verificationFiles || [];
  const selectedFilesSize = selectedFiles.reduce((total, file) => total + file.size, 0);

  const typeOptions = [
    { value: TypeOrganisme.PRIVE, label: t('requestAccount.typePrive') },
    { value: TypeOrganisme.PUBLIC, label: t('requestAccount.typePublic') },
    { value: TypeOrganisme.SOCIETE_CIVILE, label: t('requestAccount.typeCivil') },
  ];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!formData.companyName || !formData.type || !formData.responsibleFirstName || !formData.responsibleLastName || !formData.companyEmail) {
      toast.error(t('requestAccount.toastRequired'));
      return;
    }
    if (!selectedFiles.length) {
      toast.error(t('requestAccount.toastNeedPdf'));
      return;
    }
    if (selectedFiles.length > MAX_VERIFICATION_FILES) {
      toast.error(t('requestAccount.toastMaxFiles', { max: MAX_VERIFICATION_FILES }));
      return;
    }
    const oversizedFile = selectedFiles.find((file) => file.size > MAX_PDF_FILE_SIZE);
    if (oversizedFile) {
      toast.error(t('requestAccount.toastFileTooBig', { name: oversizedFile.name, max: MAX_PDF_FILE_SIZE_MB }));
      return;
    }
    if (selectedFilesSize > MAX_TOTAL_PDF_SIZE) {
      toast.error(t('requestAccount.toastTotalTooBig', { max: MAX_TOTAL_PDF_SIZE_MB }));
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
        phone: formData.phone?.trim(),
        address: formData.address?.trim(),
        sector: formData.sector?.trim(),
        message: formData.message?.trim(),
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

  const handleFilesSelected = (files: FileList | null) => {
    const newFiles = Array.from(files || []);
    if (newFiles.length === 0) return;

    const invalidFiles = newFiles.filter((file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'));
    if (invalidFiles.length > 0) {
      toast.error(t('requestAccount.toastOnlyPdf'));
    }

    const pdfFiles = newFiles.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) return;

    const oversizedFiles = pdfFiles.filter((file) => file.size > MAX_PDF_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(t('requestAccount.toastFileOversized', { name: oversizedFiles[0].name, max: MAX_PDF_FILE_SIZE_MB }));
    }

    const acceptableFiles = pdfFiles.filter((file) => file.size <= MAX_PDF_FILE_SIZE);
    if (acceptableFiles.length === 0) return;

    setFormData((current) => {
      const currentFiles = current.verificationFiles || [];
      const remainingSlots = MAX_VERIFICATION_FILES - currentFiles.length;
      const currentSize = currentFiles.reduce((total, file) => total + file.size, 0);

      if (remainingSlots <= 0) {
        toast.error(t('requestAccount.toastMaxSlots', { max: MAX_VERIFICATION_FILES }));
        return current;
      }

      const filesToAdd: File[] = [];
      for (const file of acceptableFiles) {
        const nextTotalSize = currentSize + filesToAdd.reduce((total, addedFile) => total + addedFile.size, 0) + file.size;
        if (nextTotalSize > MAX_TOTAL_PDF_SIZE) {
          toast.error(t('requestAccount.toastMaxTotalSize', { max: MAX_TOTAL_PDF_SIZE_MB }));
          break;
        }
        filesToAdd.push(file);
        if (filesToAdd.length === remainingSlots) break;
      }

      if (acceptableFiles.length > remainingSlots) {
        toast.warning(t('requestAccount.toastOnlyAdded', { added: remainingSlots, max: MAX_VERIFICATION_FILES }));
      }
      if (filesToAdd.length === 0) return current;

      return {
        ...current,
        verificationFiles: [...currentFiles, ...filesToAdd],
      };
    });
  };

  const removeSelectedFile = (indexToRemove: number) => {
    setFormData((current) => ({
      ...current,
      verificationFiles: (current.verificationFiles || []).filter((_, index) => index !== indexToRemove),
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))}KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="hidden rounded-2xl border border-white/10 bg-white/10 p-8 text-white shadow-xl backdrop-blur lg:block">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary-400">
              <FileCheck2 className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold leading-tight">{t('requestAccount.asideTitle')}</h1>
            <p className="mt-4 text-sm leading-6 text-primary-100">
              {t('requestAccount.asideDesc')}
            </p>
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
                <Upload className="mt-0.5 h-5 w-5 text-secondary-300" />
                <span>{t('requestAccount.asideFiles')}</span>
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
                <p className="mt-3 max-w-md text-sm leading-6 text-gray-600">
                  {t('requestAccount.submittedDesc')}
                </p>
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
                      <input
                        required
                        className="input"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder={t('requestAccount.companyNamePlaceholder')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">{t('requestAccount.companyType')} *</label>
                      <select
                        required
                        className="select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as TypeOrganisme })}
                      >
                        {typeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">{t('requestAccount.responsibleFirst')} *</label>
                      <input
                        required
                        className="input"
                        value={formData.responsibleFirstName}
                        onChange={(e) => setFormData({ ...formData, responsibleFirstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">{t('requestAccount.responsibleLast')} *</label>
                      <input
                        required
                        className="input"
                        value={formData.responsibleLastName}
                        onChange={(e) => setFormData({ ...formData, responsibleLastName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">{t('requestAccount.companyEmail')} *</label>
                      <input
                        required
                        type="email"
                        className="input"
                        value={formData.companyEmail}
                        onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                        placeholder={t('requestAccount.companyEmailPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="label">{t('requestAccount.phone')}</label>
                      <input
                        type="tel"
                        className="input"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">{t('requestAccount.address')}</label>
                      <input
                        className="input"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">{t('requestAccount.sector')}</label>
                      <input
                        className="input"
                        value={formData.sector}
                        onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                        placeholder={t('requestAccount.sectorPlaceholder')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">{t('requestAccount.message')}</label>
                      <textarea
                        rows={3}
                        className="input"
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder={t('requestAccount.messagePlaceholder')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">{t('requestAccount.verificationFiles')}</label>
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:bg-gray-100">
                      <Upload className="mb-2 h-6 w-6 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">{t('requestAccount.attachPdf')}</span>
                      <span className="mt-1 text-xs text-gray-500">
                        {t('requestAccount.pdfHint', { max: MAX_PDF_FILE_SIZE_MB })}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          handleFilesSelected(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      {t('requestAccount.filesCount', {
                        selected: selectedFiles.length,
                        max: MAX_VERIFICATION_FILES,
                        size: formatFileSize(selectedFilesSize),
                        total: MAX_TOTAL_PDF_SIZE_MB,
                      })}
                    </p>
                    {selectedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${file.size}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700"
                          >
                            <span className="min-w-0 flex-1 truncate">{file.name}</span>
                            <span className="flex-shrink-0 text-gray-400">{formatFileSize(file.size)}</span>
                            <button
                              type="button"
                              onClick={() => removeSelectedFile(index)}
                              className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                              title={t('requestAccount.removeFileTitle')}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full gap-2 py-3 text-base disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        {t('requestAccount.submitting')}
                      </span>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        {t('requestAccount.submit')}
                      </>
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
