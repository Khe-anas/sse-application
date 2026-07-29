import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Building2, Layers3, Pencil, Plus, Save, Tags, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminCatalogueService,
  type SecteurPayload,
  type TypeOrganismePayload,
} from '@/services/adminCatalogueService';
import {
  type SecteurDefinition,
  type TypeOrganismeDefinition,
} from '@/types';

type Tab = 'types' | 'sectors';

export default function CataloguesPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('types');
  const [types, setTypes] = useState<TypeOrganismeDefinition[]>([]);
  const [sectors, setSectors] = useState<SecteurDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [typeEditor, setTypeEditor] = useState<TypeOrganismeDefinition | 'new' | null>(null);
  const [sectorEditor, setSectorEditor] = useState<SecteurDefinition | 'new' | null>(null);
  const [typeForm, setTypeForm] = useState<TypeOrganismePayload>({
    label: '',
    description: '',
    active: true,
  });
  const [sectorForm, setSectorForm] = useState<SecteurPayload>({
    label: '',
    description: '',
    active: true,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedTypes, loadedSectors] = await Promise.all([
        adminCatalogueService.getTypes(),
        adminCatalogueService.getSectors(),
      ]);
      setTypes(loadedTypes);
      setSectors(loadedSectors);
    } catch {
      toast.error(t('catalogues.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openNew = () => {
    if (tab === 'types') {
      setTypeForm({ label: '', description: '', active: true });
      setTypeEditor('new');
    } else {
      setSectorForm({ label: '', description: '', active: true });
      setSectorEditor('new');
    }
  };

  const openType = (type: TypeOrganismeDefinition) => {
    setTypeForm({
      code: type.code,
      label: type.label,
      description: type.description || '',
      active: type.active,
    });
    setTypeEditor(type);
  };

  const openSector = (sector: SecteurDefinition) => {
    setSectorForm({
      code: sector.code,
      label: sector.label,
      description: sector.description || '',
      active: sector.active,
    });
    setSectorEditor(sector);
  };

  const saveType = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (typeEditor === 'new') {
        await adminCatalogueService.createType(typeForm);
        toast.success(t('catalogues.typeCreated'));
      } else if (typeEditor) {
        await adminCatalogueService.updateType(typeEditor.id, typeForm);
        toast.success(t('catalogues.typeUpdated'));
      }
      setTypeEditor(null);
      await loadData();
    } catch {
      toast.error(t('catalogues.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const saveSector = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (sectorEditor === 'new') {
        await adminCatalogueService.createSector(sectorForm);
        toast.success(t('catalogues.sectorCreated'));
      } else if (sectorEditor) {
        await adminCatalogueService.updateSector(sectorEditor.id, sectorForm);
        toast.success(t('catalogues.sectorUpdated'));
      }
      setSectorEditor(null);
      await loadData();
    } catch {
      toast.error(t('catalogues.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">{t('catalogues.eyebrow')}</p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-gray-900 dark:text-slate-100">{t('catalogues.title')}</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-slate-400">{t('catalogues.subtitle')}</p>
        </div>
        <button type="button" onClick={openNew} className="btn-primary gap-2 self-start">
          <Plus className="h-4 w-4" />
          {tab === 'types' ? t('catalogues.newType') : t('catalogues.newSector')}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CatalogueSummary icon={Building2} label={t('catalogues.typesCount')} value={types.length} />
        <CatalogueSummary icon={Layers3} label={t('catalogues.sectorsCount')} value={sectors.length} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex gap-1 border-b border-gray-100 p-2 dark:border-slate-800">
          <TabButton active={tab === 'types'} onClick={() => setTab('types')} icon={Tags} label={t('catalogues.typesTab')} />
          <TabButton active={tab === 'sectors'} onClick={() => setTab('sectors')} icon={Layers3} label={t('catalogues.sectorsTab')} />
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead className="table-head">
              <tr>
                <th className="table-th">{t('common.name')}</th>
                <th className="table-th">{t('catalogues.code')}</th>
                <th className="table-th">{t('common.description')}</th>
                <th className="table-th">{t('common.status')}</th>
                <th className="table-th text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-slate-800 dark:bg-[#132129]">
              {isLoading ? (
                <tr><td colSpan={5} className="table-td py-10 text-center">{t('common.loading')}</td></tr>
              ) : tab === 'types' ? types.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40">
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-slate-100">{type.label}</span>
                      {type.systemType && <span className="badge bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">{t('catalogues.system')}</span>}
                    </div>
                  </td>
                  <td className="table-td font-mono text-xs">{type.code}</td>
                  <td className="table-td max-w-sm truncate text-gray-500">{type.description || '-'}</td>
                  <td className="table-td"><StatusBadge active={type.active} /></td>
                  <td className="table-td text-end"><EditButton onClick={() => openType(type)} label={t('common.edit')} /></td>
                </tr>
              )) : sectors.map((sector) => (
                <tr key={sector.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40">
                  <td className="table-td font-semibold text-gray-900 dark:text-slate-100">{sector.label}</td>
                  <td className="table-td font-mono text-xs">{sector.code}</td>
                  <td className="table-td max-w-sm truncate text-gray-500">{sector.description || '-'}</td>
                  <td className="table-td"><StatusBadge active={sector.active} /></td>
                  <td className="table-td text-end"><EditButton onClick={() => openSector(sector)} label={t('common.edit')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {typeEditor && createPortal(
        <EditorShell title={typeEditor === 'new' ? t('catalogues.createType') : t('catalogues.editType')} onClose={() => setTypeEditor(null)}>
          <form onSubmit={saveType}>
            <div className="space-y-4 px-6 py-5">
              <div><label htmlFor="type-label" className="label">{t('common.name')} *</label><input id="type-label" required className="input" value={typeForm.label} onChange={(event) => setTypeForm({ ...typeForm, label: event.target.value })} /></div>
              <div><label htmlFor="type-code" className="label">{t('catalogues.code')}</label><input id="type-code" disabled={typeEditor !== 'new'} className="input uppercase" placeholder={t('catalogues.codePlaceholder')} value={typeForm.code || ''} onChange={(event) => setTypeForm({ ...typeForm, code: event.target.value })} /></div>
              <div><label htmlFor="type-description" className="label">{t('common.description')}</label><textarea id="type-description" rows={3} className="input" value={typeForm.description || ''} onChange={(event) => setTypeForm({ ...typeForm, description: event.target.value })} /></div>
              {typeEditor !== 'new' && !typeEditor.systemType && <ActiveField checked={typeForm.active ?? true} onChange={(active) => setTypeForm({ ...typeForm, active })} />}
            </div>
            <EditorFooter saving={isSaving} onCancel={() => setTypeEditor(null)} />
          </form>
        </EditorShell>,
        document.body,
      )}

      {sectorEditor && createPortal(
        <EditorShell title={sectorEditor === 'new' ? t('catalogues.createSector') : t('catalogues.editSector')} onClose={() => setSectorEditor(null)}>
          <form onSubmit={saveSector}>
            <div className="space-y-4 px-6 py-5">
              <div><label htmlFor="sector-label" className="label">{t('common.name')} *</label><input id="sector-label" required className="input" value={sectorForm.label} onChange={(event) => setSectorForm({ ...sectorForm, label: event.target.value })} /></div>
              <div><label htmlFor="sector-code" className="label">{t('catalogues.code')}</label><input id="sector-code" disabled={sectorEditor !== 'new'} className="input uppercase" placeholder={t('catalogues.codePlaceholder')} value={sectorForm.code || ''} onChange={(event) => setSectorForm({ ...sectorForm, code: event.target.value })} /></div>
              <div><label htmlFor="sector-description" className="label">{t('common.description')}</label><textarea id="sector-description" rows={3} className="input" value={sectorForm.description || ''} onChange={(event) => setSectorForm({ ...sectorForm, description: event.target.value })} /></div>
              {sectorEditor !== 'new' && <ActiveField checked={sectorForm.active ?? true} onChange={(active) => setSectorForm({ ...sectorForm, active })} />}
            </div>
            <EditorFooter saving={isSaving} onCancel={() => setSectorEditor(null)} />
          </form>
        </EditorShell>,
        document.body,
      )}
    </div>
  );
}

function CatalogueSummary({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
  return <div className="card flex items-center gap-4 p-5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-slate-100">{value}</p><p className="text-sm text-gray-500 dark:text-slate-400">{label}</p></div></div>;
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Tags; label: string }) {
  return <button type="button" onClick={onClick} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}><Icon className="h-4 w-4" />{label}</button>;
}

function StatusBadge({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return <span className={`badge ${active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'}`}>{active ? t('common.active') : t('common.inactive')}</span>;
}

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className="icon-button h-9 w-9" title={label} aria-label={label}><Pencil className="h-4 w-4" /></button>;
}

function EditorShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useTranslation();
  return <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-[1px]" role="dialog" aria-modal="true"><div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#132129]"><div className="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-slate-800"><h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{title}</h2><button type="button" onClick={onClose} className="icon-button" aria-label={t('common.close')}><X className="h-5 w-5" /></button></div>{children}</div></div>;
}

function ActiveField({ checked, onChange }: { checked: boolean; onChange: (active: boolean) => void }) {
  const { t } = useTranslation();
  return <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-slate-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-600" /><span><span className="block text-sm font-semibold text-gray-800 dark:text-slate-100">{t('catalogues.activeItem')}</span><span className="block text-xs text-gray-500 dark:text-slate-400">{t('catalogues.activeItemHint')}</span></span></label>;
}

function EditorFooter({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  const { t } = useTranslation();
  return <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4 dark:border-slate-800"><button type="button" onClick={onCancel} className="btn-outline" disabled={saving}>{t('common.cancel')}</button><button type="submit" className="btn-primary gap-2" disabled={saving}><Save className="h-4 w-4" />{saving ? t('common.loading') : t('common.save')}</button></div>;
}
