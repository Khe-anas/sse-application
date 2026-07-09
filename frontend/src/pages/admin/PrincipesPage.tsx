import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, BookOpen, Plus, Edit3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Principe } from '@/types';
import KPICard from '@/components/dashboard/KPICard';
import { getLocalizedField } from '@/utils/localization';
import { referenceDataService } from '@/services/referenceDataService';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, string>) => Promise<void>;
  title: string;
  fields: { key: string; label: string; type?: 'text' | 'textarea'; required?: boolean }[];
  initialData?: Record<string, string>;
}

function FormModal({ isOpen, onClose, onSave, title, fields, initialData }: FormModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, string>>(initialData || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(initialData || {});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch { /* toast handled by caller */ }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <div className="p-5 space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'textarea' ? (
                <textarea
                  value={formData[f.key] || ''}
                  onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-input"
                  rows={3}
                />
              ) : (
                <input
                  type="text"
                  value={formData[f.key] || ''}
                  onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-input"
                />
              )}
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-outline">{t('common.cancel')}</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? t('common.save') + '...' : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PrincipesPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const [principes, setPrincipes] = useState<Principe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPrincipe, setExpandedPrincipe] = useState<string | null>(null);
  const [expandedBP, setExpandedBP] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    type: 'principe' | 'bp' | 'critere';
    mode: 'create' | 'edit';
    parentId?: string;
    data?: any;
  } | null>(null);

  const loadPrincipes = useCallback(async () => {
    try {
      const data = await referenceDataService.getAll();
      setPrincipes(data);
    } catch { toast.error(t('principesPage.loadError')); }
    finally { setIsLoading(false); }
  }, [t]);

  useEffect(() => { loadPrincipes(); }, [loadPrincipes]);

  const handleDelete = async (type: string, id: string, label: string) => {
    if (!confirm(t('principesPage.deleteConfirm', { label }))) return;
    try {
      if (type === 'principe') await referenceDataService.deletePrincipe(id);
      else if (type === 'bp') await referenceDataService.deleteBonnePratique(id);
      else if (type === 'critere') await referenceDataService.deleteCritere(id);
      toast.success(t('principesPage.deleted'));
      loadPrincipes();
    } catch { toast.error(t('principesPage.deleteError')); }
  };

  const getPrincipeFields = (mode: 'create' | 'edit', _data?: any) => [
    { key: 'nameFr', label: t('principesPage.nameFr'), required: true },
    { key: 'nameAr', label: t('principesPage.nameAr') },
    { key: 'nameEn', label: t('principesPage.nameEn') },
    ...(mode === 'edit' ? [
      { key: 'descriptionFr', label: t('principesPage.descriptionFr'), type: 'textarea' as const },
      { key: 'descriptionAr', label: t('principesPage.descriptionAr'), type: 'textarea' as const },
      { key: 'descriptionEn', label: t('principesPage.descriptionEn'), type: 'textarea' as const },
      { key: 'weight', label: t('principesPage.weight') },
    ] : []),
  ];

  const getBPFields = () => [
    { key: 'labelFr', label: t('principesPage.labelFr'), required: true },
    { key: 'labelAr', label: t('principesPage.labelAr') },
    { key: 'labelEn', label: t('principesPage.labelEn') },
  ];

  const getCritereFields = () => [
    { key: 'labelFr', label: t('principesPage.labelFr'), required: true },
    { key: 'labelAr', label: t('principesPage.labelAr') },
    { key: 'labelEn', label: t('principesPage.labelEn') },
    { key: 'preuvesFr', label: t('principesPage.preuvesFr'), type: 'textarea' as const },
    { key: 'preuvesAr', label: t('principesPage.preuvesAr'), type: 'textarea' as const },
    { key: 'preuvesEn', label: t('principesPage.preuvesEn'), type: 'textarea' as const },
    { key: 'referencesFr', label: t('principesPage.referencesFr'), type: 'textarea' as const },
    { key: 'referencesAr', label: t('principesPage.referencesAr'), type: 'textarea' as const },
    { key: 'referencesEn', label: t('principesPage.referencesEn'), type: 'textarea' as const },
  ];

  const handleSave = async (data: Record<string, string>) => {
    if (!modal) return;
    try {
      if (modal.type === 'principe') {
        if (modal.mode === 'create') await referenceDataService.createPrincipe(data as any);
        else await referenceDataService.updatePrincipe(modal.data.id, data);
      } else if (modal.type === 'bp') {
        if (modal.mode === 'create') await referenceDataService.createBonnePratique({ ...data as any, principeId: modal.parentId! });
        else await referenceDataService.updateBonnePratique(modal.data.id, data);
      } else if (modal.type === 'critere') {
        if (modal.mode === 'create') await referenceDataService.createCritere({ ...data as any, bonnePratiqueId: modal.parentId! });
        else await referenceDataService.updateCritere(modal.data.id, data);
      }
      toast.success(t('principesPage.saved'));
      loadPrincipes();
    } catch { toast.error(t('principesPage.saveError')); }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700" /></div>;
  }

  const activeModal = modal;
  let modalFields: { key: string; label: string; type?: 'text' | 'textarea'; required?: boolean }[] = [];
  let modalTitle = '';
  let modalInitial: Record<string, string> = {};

  if (activeModal) {
    if (activeModal.type === 'principe') {
      modalFields = getPrincipeFields(activeModal.mode, activeModal.data);
      modalTitle = activeModal.mode === 'create' ? t('principesPage.addPrincipe') : t('principesPage.editPrincipe');
      if (activeModal.mode === 'edit' && activeModal.data) {
        modalInitial = {
          nameFr: activeModal.data.nameFr || '',
          nameAr: activeModal.data.nameAr || '',
          nameEn: activeModal.data.nameEn || '',
          descriptionFr: activeModal.data.descriptionFr || '',
          descriptionAr: activeModal.data.descriptionAr || '',
          descriptionEn: activeModal.data.descriptionEn || '',
          weight: String(activeModal.data.weight || '1.0'),
        };
      }
    } else if (activeModal.type === 'bp') {
      modalFields = getBPFields();
      modalTitle = activeModal.mode === 'create' ? t('principesPage.addBP') : t('principesPage.editBP');
      if (activeModal.mode === 'edit' && activeModal.data) {
        modalInitial = {
          labelFr: activeModal.data.labelFr || '',
          labelAr: activeModal.data.labelAr || '',
          labelEn: activeModal.data.labelEn || '',
        };
      }
    } else if (activeModal.type === 'critere') {
      modalFields = getCritereFields();
      modalTitle = activeModal.mode === 'create' ? t('principesPage.addCritere') : t('principesPage.editCritere');
      if (activeModal.mode === 'edit' && activeModal.data) {
        modalInitial = {
          labelFr: activeModal.data.labelFr || '',
          labelAr: activeModal.data.labelAr || '',
          labelEn: activeModal.data.labelEn || '',
          preuvesFr: activeModal.data.preuvesFr || '',
          preuvesAr: activeModal.data.preuvesAr || '',
          preuvesEn: activeModal.data.preuvesEn || '',
          referencesFr: activeModal.data.referencesFr || '',
          referencesAr: activeModal.data.referencesAr || '',
          referencesEn: activeModal.data.referencesEn || '',
        };
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('navigation.principes')}</h1>
        <button onClick={() => setModal({ type: 'principe', mode: 'create' })} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> {t('principesPage.addPrincipe')}
        </button>
      </div>

      <KPICard title={t('principesPage.kpiTitle')} value={principes.length} icon={BookOpen} color="primary" />

      <div className="space-y-3">
        {principes.map((principe) => (
          <div key={principe.id} className="card overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => setExpandedPrincipe(expandedPrincipe === principe.id ? null : principe.id)}
                className="flex items-center gap-4 flex-1 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold">
                  {principe.number}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{getLocalizedField(principe, 'name', language)}</h3>
                  <p className="text-sm text-gray-500">{t('principesPage.bonnesPratiques', { count: principe.bonnesPratiques.length })}</p>
                </div>
                {expandedPrincipe === principe.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              <div className="flex items-center gap-1 ml-2">
                {!principe.isFixed && (
                  <>
                    <button onClick={() => setModal({ type: 'principe', mode: 'edit', data: principe })} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-700" title={t('common.edit')}>
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete('principe', principe.id, getLocalizedField(principe, 'name', language))} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600" title={t('common.delete')}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {expandedPrincipe === principe.id && (
              <div className="border-t border-gray-100 px-4 pb-4">
                <div className="flex items-center justify-between mt-3 ml-14">
                  <span className="text-sm font-medium text-gray-500">{t('principesPage.bonnesPratiquesList')}</span>
                  <button onClick={() => setModal({ type: 'bp', mode: 'create', parentId: principe.id })} className="text-xs btn-outline gap-1 py-1">
                    <Plus className="w-3 h-3" /> {t('principesPage.addBP')}
                  </button>
                </div>
                {principe.bonnesPratiques.map((bp) => (
                  <div key={bp.id} className="mt-2 ml-14">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setExpandedBP(expandedBP === bp.id ? null : bp.id)}
                        className="flex items-center gap-2 text-left hover:text-primary-700 flex-1"
                      >
                        {expandedBP === bp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span className="font-medium text-gray-800">{getLocalizedField(bp, 'label', language)}</span>
                        <span className="text-xs text-gray-400">{t('principesPage.criteres', { count: bp.criteres.length })}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal({ type: 'critere', mode: 'create', parentId: bp.id })} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-700" title={t('principesPage.addCritere')}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setModal({ type: 'bp', mode: 'edit', data: bp })} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-700" title={t('common.edit')}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete('bp', bp.id, getLocalizedField(bp, 'label', language))} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600" title={t('common.delete')}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {expandedBP === bp.id && (
                      <div className="mt-2 ml-6 space-y-2">
                        {bp.criteres.map((critere) => {
                          const preuves = getLocalizedField(critere, 'preuves', language);
                          const references = getLocalizedField(critere, 'references', language);

                          return (
                            <div key={critere.id} className="p-3 bg-gray-50 rounded-lg group">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-800 font-medium">{critere.number}. {getLocalizedField(critere, 'label', language)}</p>
                                  {preuves && <p className="text-xs text-blue-700 mt-1"><span className="font-semibold">{t('principesPage.preuvesLabel')}</span> {preuves}</p>}
                                  {references && <p className="text-xs text-gray-500 mt-0.5"><span className="font-semibold">{t('principesPage.referencesLabel')}</span> {references}</p>}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setModal({ type: 'critere', mode: 'edit', data: critere })} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-primary-700" title={t('common.edit')}>
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDelete('critere', critere.id, getLocalizedField(critere, 'label', language))} className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-600" title={t('common.delete')}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <FormModal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        onSave={handleSave}
        title={modalTitle}
        fields={modalFields}
        initialData={modalInitial}
      />
    </div>
  );
}
