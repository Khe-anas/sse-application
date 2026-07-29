import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Pencil, Plus, Search, Trash2, X, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { organismeService } from '@/services/organismeService';
import { catalogueService } from '@/services/adminCatalogueService';
import { fileService } from '@/services/fileService';
import { TypeOrganisme } from '@/types';
import type {
  Organisme,
  PageResponse,
  SecteurDefinition,
  TypeOrganismeDefinition,
} from '@/types';
import KPICard from '@/components/dashboard/KPICard';
import useConfirmDialog from '@/components/ui/useConfirmDialog';
import { useAuthStore } from '@/stores/authStore';

export default function OrganismesPage() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const canWrite = Boolean(currentUser?.systemAdmin || currentUser?.permissions?.includes('ORGANISMES_WRITE'));
  const [organismes, setOrganismes] = useState<PageResponse<Organisme> | null>(null);
  const [types, setTypes] = useState<TypeOrganismeDefinition[]>([]);
  const [sectors, setSectors] = useState<SecteurDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisme | null>(null);
  const [formData, setFormData] = useState<Partial<Organisme>>({ type: TypeOrganisme.PUBLIC });
  const [logoObjectUrls, setLogoObjectUrls] = useState<Record<string, string>>({});
  const [failedLogoUrls, setFailedLogoUrls] = useState<Set<string>>(() => new Set());
  const [logoPreview, setLogoPreview] = useState<{ src: string; alt: string } | null>(null);
  const { confirm: confirmAction, confirmationDialog } = useConfirmDialog();

  const loadOrganismes = useCallback(async () => {
    try {
      const data = await organismeService.getAll({ search: search || undefined });
      setOrganismes(data);
    } catch {
      toast.error(t('organismesPage.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [search, t]);

  const loadCatalogues = useCallback(async () => {
    try {
      const [loadedTypes, loadedSectors] = await Promise.all([
        catalogueService.getTypes(),
        catalogueService.getSectors(),
      ]);
      setTypes(loadedTypes);
      setSectors(loadedSectors);
    } catch {
      toast.error(t('organismesPage.catalogueLoadError'));
    }
  }, [t]);

  useEffect(() => {
    void loadOrganismes();
  }, [loadOrganismes]);

  useEffect(() => {
    void loadCatalogues();
  }, [loadCatalogues]);

  const logoUrlKey = useMemo(
    () => Array.from(new Set(
      organismes?.content.map((organisme) => organisme.logoUrl).filter((url): url is string => Boolean(url)) || [],
    )).join('\0'),
    [organismes],
  );

  useEffect(() => {
    const urls = logoUrlKey ? logoUrlKey.split('\0') : [];
    const generatedUrls: string[] = [];
    let cancelled = false;
    setLogoObjectUrls({});
    setFailedLogoUrls(new Set());

    urls.forEach((logoUrl) => {
      fileService.getObjectUrl(logoUrl)
        .then((objectUrl) => {
          generatedUrls.push(objectUrl);
          if (!cancelled) {
            setLogoObjectUrls((current) => ({ ...current, [logoUrl]: objectUrl }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setFailedLogoUrls((current) => new Set(current).add(logoUrl));
          }
        });
    });

    return () => {
      cancelled = true;
      generatedUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [logoUrlKey]);

  const resetForm = () => {
    const defaultType = types[0];
    setFormData({
      type: defaultType?.baseType || TypeOrganisme.PUBLIC,
      typeDefinitionId: defaultType?.id,
    });
  };

  const openCreate = () => {
    setEditingOrg(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (organisme: Organisme) => {
    setEditingOrg(organisme);
    setFormData({ ...organisme });
    setShowModal(true);
  };

  const handleTypeChange = (typeDefinitionId: string) => {
    const definition = types.find((type) => type.id === typeDefinitionId);
    setFormData({
      ...formData,
      typeDefinitionId: definition?.id,
      type: definition?.baseType || TypeOrganisme.PUBLIC,
    });
  };

  const sectorLabel = (code?: string) => {
    if (!code) return '-';
    return sectors.find((sector) => sector.code === code)?.label || code;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editingOrg) {
        await organismeService.update(editingOrg.id, formData);
        toast.success(t('organismesPage.updated'));
      } else {
        await organismeService.create(formData);
        toast.success(t('organismesPage.created'));
      }
      setShowModal(false);
      setEditingOrg(null);
      resetForm();
      await loadOrganismes();
    } catch {
      toast.error(t('organismesPage.error'));
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAction({
      title: t('common.confirm'),
      description: t('organismesPage.deleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await organismeService.delete(id);
      toast.success(t('organismesPage.deleted'));
      await loadOrganismes();
    } catch {
      toast.error(t('organismesPage.error'));
    }
  };

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('navigation.organismes')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t('organismesPage.subtitle')}</p>
        </div>
        {canWrite && (
          <button onClick={openCreate} className="btn-primary gap-2 self-start">
            <Plus className="h-4 w-4" /> {t('organismesPage.new')}
          </button>
        )}
      </div>

      <KPICard title={t('organismesPage.total')} value={organismes?.totalElements || 0} icon={Building2} color="primary" />

      <div className="filter-panel">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('organismesPage.searchPlaceholder')} className="input ps-10" />
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead className="table-head">
            <tr>
              <th className="table-th">{t('common.logo')}</th>
              <th className="table-th">{t('common.name')}</th>
              <th className="table-th">{t('common.type')}</th>
              <th className="table-th">{t('common.sector')}</th>
              <th className="table-th">{t('common.address')}</th>
              <th className="table-th">{t('common.contact')}</th>
              <th className="table-th">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-800 dark:bg-[#132129]">
            {isLoading ? (
              <tr><td colSpan={7} className="table-td py-8 text-center">{t('common.loading')}</td></tr>
            ) : organismes?.content.length === 0 ? (
              <tr><td colSpan={7} className="table-td py-8 text-center">{t('organismesPage.empty')}</td></tr>
            ) : organismes?.content.map((organisme) => (
              <tr key={organisme.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                <td className="table-td">
                  <OrganisationLogo
                    logoUrl={organisme.logoUrl}
                    objectUrl={organisme.logoUrl ? logoObjectUrls[organisme.logoUrl] : undefined}
                    hasError={organisme.logoUrl ? failedLogoUrls.has(organisme.logoUrl) : false}
                    alt={t('organismesPage.logoAlt', { name: organisme.name })}
                    previewLabel={t('organismesPage.enlargeLogo')}
                    onPreview={(src, alt) => setLogoPreview({ src, alt })}
                  />
                </td>
                <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{organisme.name}</td>
                <td className="table-td">
                  <span className={`badge ${organisme.type === TypeOrganisme.PUBLIC ? 'bg-blue-100 text-blue-700' : organisme.type === TypeOrganisme.PRIVE ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                    {organisme.typeLabel || t(`organisme.type.${organisme.type}`)}
                  </span>
                </td>
                <td className="table-td text-gray-500 dark:text-slate-400">{sectorLabel(organisme.sector)}</td>
                <td className="table-td max-w-xs truncate text-gray-500 dark:text-slate-400">{organisme.address || '-'}</td>
                <td className="table-td text-gray-500 dark:text-slate-400">
                  <div>{organisme.email || '-'}</div>
                  {organisme.phone && <div className="text-xs text-gray-400">{organisme.phone}</div>}
                </td>
                <td className="table-td">
                  {canWrite ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(organisme)} className="icon-button h-9 w-9 border-0 bg-transparent text-blue-600 shadow-none hover:bg-blue-50" aria-label={t('common.edit')}><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => void handleDelete(organisme.id)} className="icon-button h-9 w-9 border-0 bg-transparent text-red-600 shadow-none hover:bg-red-50" aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ) : <span className="text-gray-400">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true" aria-labelledby="organisme-editor-title">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#132129]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-700 dark:text-primary-300">{t('organismesPage.editorEyebrow')}</p>
                <h2 id="organisme-editor-title" className="mt-1 text-xl font-bold text-gray-900 dark:text-slate-100">{editingOrg ? t('organismesPage.editTitle') : t('organismesPage.createTitle')}</h2>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="icon-button" aria-label={t('common.close')}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="grid max-h-[68vh] gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
                <div className="md:col-span-2"><label className="label">{t('organismesPage.nameLabel')} *</label><input type="text" required className="input" value={formData.name || ''} onChange={(event) => setFormData({ ...formData, name: event.target.value })} /></div>
                <div>
                  <label className="label">{t('organismesPage.typeLabel')} *</label>
                  <select required className="select" value={formData.typeDefinitionId || ''} onChange={(event) => handleTypeChange(event.target.value)}>
                    <option value="" disabled>{t('common.selectPlaceholder')}</option>
                    {types.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">{t('organismesPage.sectorLabel')}</label>
                  <select className="select" value={formData.sector || ''} onChange={(event) => setFormData({ ...formData, sector: event.target.value || undefined })}>
                    <option value="">{t('common.selectPlaceholder')}</option>
                    {sectors.map((sector) => <option key={sector.id} value={sector.code}>{sector.label}</option>)}
                    {formData.sector && !sectors.some((sector) => sector.code === formData.sector) && <option value={formData.sector}>{formData.sector}</option>}
                  </select>
                </div>
                <div className="md:col-span-2"><label className="label">{t('organismesPage.addressLabel')}</label><textarea rows={3} className="input" value={formData.address || ''} onChange={(event) => setFormData({ ...formData, address: event.target.value })} /></div>
                <div><label className="label">{t('organismesPage.emailLabel')}</label><input type="email" className="input" value={formData.email || ''} onChange={(event) => setFormData({ ...formData, email: event.target.value })} /></div>
                <div><label className="label">{t('organismesPage.phoneLabel')}</label><input type="tel" className="input" value={formData.phone || ''} onChange={(event) => setFormData({ ...formData, phone: event.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">{t('common.cancel')}</button>
                <button type="submit" className="btn-primary">{editingOrg ? t('organismesPage.update') : t('organismesPage.create')}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {logoPreview && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={logoPreview.alt} onClick={() => setLogoPreview(null)}>
          <button type="button" onClick={() => setLogoPreview(null)} className="absolute end-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label={t('common.close')}><X className="h-6 w-6" /></button>
          <img src={logoPreview.src} alt={logoPreview.alt} onClick={(event) => event.stopPropagation()} className="max-h-[86vh] max-w-[92vw] rounded-xl bg-white p-4 object-contain shadow-2xl" />
        </div>,
        document.body,
      )}
      {confirmationDialog}
    </div>
  );
}

function OrganisationLogo({
  logoUrl,
  objectUrl,
  hasError,
  alt,
  onPreview,
  previewLabel,
}: {
  logoUrl?: string;
  objectUrl?: string;
  hasError: boolean;
  alt: string;
  onPreview: (src: string, alt: string) => void;
  previewLabel: string;
}) {
  if (!logoUrl || hasError) {
    return <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-slate-800"><Building2 className="h-5 w-5" /></span>;
  }
  if (!objectUrl) {
    return <span className="block h-11 w-11 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-800" />;
  }
  return (
    <button type="button" onClick={() => onPreview(objectUrl, alt)} className="group relative flex h-11 w-11 cursor-zoom-in items-center justify-center rounded-lg border border-gray-200 bg-white p-1 transition hover:border-primary-300 hover:shadow-md" title={previewLabel} aria-label={previewLabel}>
      <img src={objectUrl} alt={alt} className="max-h-full max-w-full object-contain" />
      <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/35 group-hover:opacity-100"><ZoomIn className="h-4 w-4" /></span>
    </button>
  );
}
