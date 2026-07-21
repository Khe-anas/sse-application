import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Languages,
  Layers3,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BonnePratique, Critere, Principe } from '@/types';
import { Role } from '@/types';
import { getLocalizedField } from '@/utils/localization';
import { referenceDataService } from '@/services/referenceDataService';
import { useAuthStore } from '@/stores/authStore';

type EditorType = 'principe' | 'bp' | 'critere';
type EditorMode = 'create' | 'edit';
type TranslationStatus = 'idle' | 'waiting' | 'translating' | 'ready' | 'error';

interface EditorState {
  type: EditorType;
  mode: EditorMode;
  parentId?: string;
  data?: Principe | BonnePratique | Critere;
  contextLabel?: string;
}

interface EditorField {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number';
  required?: boolean;
  enKey?: string;
  arKey?: string;
  min?: number;
  step?: number;
}

interface ReferenceEditorProps {
  editor: EditorState | null;
  title: string;
  fields: EditorField[];
  initialData: Record<string, string>;
  onClose: () => void;
  onSave: (data: Record<string, string>) => Promise<void>;
}

function ReferenceEditor({ editor, title, fields, initialData, onClose, onSave }: ReferenceEditorProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>('idle');
  const lastTranslatedSignature = useRef('');
  const translationSequence = useRef(0);

  const translatableFields = useMemo(
    () => fields.filter((field) => field.enKey && field.arKey),
    [fields]
  );

  const sourcePayload = useMemo(() => Object.fromEntries(
    translatableFields
      .map((field) => [field.key, (formData[field.key] || '').trim()])
      .filter(([, value]) => value)
  ), [formData, translatableFields]);
  const sourceSignature = JSON.stringify(sourcePayload);

  useEffect(() => {
    if (!editor) return;
    setFormData(initialData);
    setSaving(false);
    translationSequence.current += 1;

    const initialSource = Object.fromEntries(
      fields
        .filter((field) => field.enKey && field.arKey)
        .map((field) => [field.key, (initialData[field.key] || '').trim()])
        .filter(([, value]) => value)
    );
    const translationsComplete = fields
      .filter((field) => field.enKey && field.arKey && initialData[field.key]?.trim())
      .every((field) => initialData[field.enKey!]?.trim() && initialData[field.arKey!]?.trim());
    lastTranslatedSignature.current = translationsComplete ? JSON.stringify(initialSource) : '';
    setTranslationStatus(translationsComplete ? 'ready' : 'idle');
  }, [editor, fields, initialData]);

  const translateData = useCallback(async (draft: Record<string, string>) => {
    const payload = Object.fromEntries(
      translatableFields
        .map((field) => [field.key, (draft[field.key] || '').trim()])
        .filter(([, value]) => value)
    );
    if (Object.keys(payload).length === 0) return draft;

    const response = await referenceDataService.translateDraft(payload);
    const translated = { ...draft };
    translatableFields.forEach((field) => {
      const value = response.fields[field.key];
      if (!value) return;
      translated[field.enKey!] = value.en;
      translated[field.arKey!] = value.ar;
    });
    lastTranslatedSignature.current = JSON.stringify(payload);
    return translated;
  }, [translatableFields]);

  useEffect(() => {
    if (!editor || Object.keys(sourcePayload).length === 0 || sourceSignature === lastTranslatedSignature.current) {
      return undefined;
    }

    setTranslationStatus('waiting');
    const sequence = ++translationSequence.current;
    const timer = window.setTimeout(async () => {
      setTranslationStatus('translating');
      try {
        const translated = await translateData(formData);
        if (sequence !== translationSequence.current) return;
        setFormData(translated);
        setTranslationStatus('ready');
      } catch {
        if (sequence !== translationSequence.current) return;
        setTranslationStatus('error');
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [editor, formData, sourcePayload, sourceSignature, translateData]);

  if (!editor) return null;

  const runTranslation = async () => {
    translationSequence.current += 1;
    setTranslationStatus('translating');
    try {
      const translated = await translateData(formData);
      setFormData(translated);
      setTranslationStatus('ready');
      return translated;
    } catch {
      setTranslationStatus('error');
      toast.error(t('principesPage.translationError'));
      throw new Error('translation-failed');
    }
  };

  const handleSave = async () => {
    const missingRequiredField = fields.some((field) => field.required && !formData[field.key]?.trim());
    if (missingRequiredField) {
      toast.error(t('principesPage.requiredFields'));
      return;
    }

    setSaving(true);
    try {
      let payload = formData;
      if (sourceSignature && sourceSignature !== lastTranslatedSignature.current) {
        payload = await runTranslation();
      }
      await onSave(payload);
      onClose();
    } catch {
      // The translation or save error is already presented to the user.
    } finally {
      setSaving(false);
    }
  };

  const statusContent = {
    idle: { icon: Sparkles, text: t('principesPage.translationIdle'), tone: 'text-gray-600' },
    waiting: { icon: Sparkles, text: t('principesPage.translationWaiting'), tone: 'text-primary-700' },
    translating: { icon: Loader2, text: t('principesPage.translating'), tone: 'text-primary-700' },
    ready: { icon: CheckCircle2, text: t('principesPage.translationReady'), tone: 'text-green-700' },
    error: { icon: AlertTriangle, text: t('principesPage.translationError'), tone: 'text-red-700' },
  }[translationStatus];
  const StatusIcon = statusContent.icon;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45" role="dialog" aria-modal="true" aria-labelledby="reference-editor-title">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label={t('common.close')} />
      <section className="relative flex h-full w-full max-w-3xl flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-[#2b3b35] dark:bg-[#17201d]">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-[#2b3b35]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-primary-700">{t('principesPage.referenceEditor')}</p>
            <h2 id="reference-editor-title" className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
            {editor.contextLabel && <p className="mt-1 truncate text-sm text-gray-500">{editor.contextLabel}</p>}
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100" title={t('common.close')}>
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <section className="border-b border-gray-200 px-5 py-5 dark:border-[#2b3b35]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-100 text-xs font-bold text-primary-700">FR</span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t('principesPage.sourceContent')}</h3>
                <p className="text-xs text-gray-500">{t('principesPage.sourceContentHint')}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-200">
                    {field.label}{field.required ? ' *' : ''}
                  </span>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={(event) => setFormData((current) => ({ ...current, [field.key]: event.target.value }))}
                      rows={4}
                      className="input resize-y"
                    />
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      min={field.min}
                      step={field.step}
                      value={formData[field.key] || ''}
                      onChange={(event) => setFormData((current) => ({ ...current, [field.key]: event.target.value }))}
                      className="input"
                    />
                  )}
                </label>
              ))}
            </div>
          </section>

          <section className="px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`flex items-center gap-2 text-sm font-medium ${statusContent.tone}`}>
                <StatusIcon className={`h-4 w-4 ${translationStatus === 'translating' ? 'animate-spin' : ''}`} />
                {statusContent.text}
              </div>
              <button type="button" onClick={() => void runTranslation()} disabled={translationStatus === 'translating' || Object.keys(sourcePayload).length === 0} className="btn-outline btn-sm gap-2 disabled:opacity-50">
                <RefreshCw className="h-4 w-4" />
                {t('principesPage.refreshTranslation')}
              </button>
            </div>

            <div className="mt-4 border border-gray-200 dark:border-[#2b3b35]">
              <div className="grid grid-cols-2 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 dark:border-[#2b3b35] dark:bg-[#0f1613] dark:text-slate-300">
                <div className="flex items-center gap-2 border-r border-gray-200 px-3 py-2 dark:border-[#2b3b35]"><Languages className="h-4 w-4" /> English</div>
                <div className="flex items-center justify-end gap-2 px-3 py-2"><Languages className="h-4 w-4" /> العربية</div>
              </div>
              {translatableFields.map((field) => (
                <div key={field.key} className="grid grid-cols-1 border-b border-gray-100 last:border-b-0 sm:grid-cols-2 dark:border-[#2b3b35]">
                  <div className="border-b border-gray-100 p-3 sm:border-b-0 sm:border-r dark:border-[#2b3b35]">
                    <p className="mb-1 text-[11px] font-semibold uppercase text-gray-400">{field.label}</p>
                    <p className="min-h-6 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-slate-200">{formData[field.enKey!] || '-'}</p>
                  </div>
                  <div className="p-3 text-right" dir="rtl">
                    <p className="mb-1 text-[11px] font-semibold text-gray-400">{field.label}</p>
                    <p className="min-h-6 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-slate-200">{formData[field.arKey!] || '-'}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-[#2b3b35]">
          <button type="button" onClick={onClose} className="btn-outline">{t('common.cancel')}</button>
          <button type="button" onClick={() => void handleSave()} disabled={saving || translationStatus === 'translating'} className="btn-primary gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('common.save')}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function PrincipesPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const { user } = useAuthStore();
  const canManage = user?.role === Role.ADMIN;
  const [principes, setPrincipes] = useState<Principe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPrincipe, setExpandedPrincipe] = useState<string | null>(null);
  const [expandedBP, setExpandedBP] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);

  const loadPrincipes = useCallback(async () => {
    try {
      const data = await referenceDataService.getAll();
      setPrincipes(data);
    } catch {
      toast.error(t('principesPage.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadPrincipes(); }, [loadPrincipes]);

  const totalBonnesPratiques = principes.reduce((sum, principe) => sum + principe.bonnesPratiques.length, 0);
  const totalCriteres = principes.reduce(
    (sum, principe) => sum + principe.bonnesPratiques.reduce((bpSum, bp) => bpSum + bp.criteres.length, 0),
    0
  );

  const filteredPrincipes = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return principes;
    return principes.filter((principe) => [
      principe.nameFr,
      principe.nameEn,
      principe.nameAr,
      ...principe.bonnesPratiques.flatMap((bp) => [
        bp.labelFr,
        bp.labelEn,
        bp.labelAr,
        ...bp.criteres.flatMap((critere) => [critere.labelFr, critere.labelEn, critere.labelAr]),
      ]),
    ].some((value) => value?.toLocaleLowerCase().includes(query)));
  }, [principes, searchQuery]);

  const handleDelete = async (type: EditorType, id: string, label: string) => {
    if (!window.confirm(t('principesPage.deleteConfirm', { label }))) return;
    try {
      if (type === 'principe') await referenceDataService.deletePrincipe(id);
      if (type === 'bp') await referenceDataService.deleteBonnePratique(id);
      if (type === 'critere') await referenceDataService.deleteCritere(id);
      toast.success(t('principesPage.deleted'));
      await loadPrincipes();
    } catch {
      toast.error(t('principesPage.deleteError'));
    }
  };

  const editorFields = useMemo<EditorField[]>(() => {
    if (!editor) return [];
    if (editor.type === 'principe') {
      return [
        { key: 'nameFr', label: t('principesPage.principleName'), required: true, enKey: 'nameEn', arKey: 'nameAr' },
        { key: 'weight', label: t('principesPage.weight'), type: 'number', required: true, min: 0.1, step: 0.1 },
        { key: 'descriptionFr', label: t('principesPage.description'), type: 'textarea', enKey: 'descriptionEn', arKey: 'descriptionAr' },
      ];
    }
    if (editor.type === 'bp') {
      return [{ key: 'labelFr', label: t('principesPage.goodPracticeLabel'), required: true, enKey: 'labelEn', arKey: 'labelAr' }];
    }
    return [
      { key: 'labelFr', label: t('principesPage.criterionLabel'), type: 'textarea', required: true, enKey: 'labelEn', arKey: 'labelAr' },
      { key: 'preuvesFr', label: t('principesPage.expectedEvidence'), type: 'textarea', enKey: 'preuvesEn', arKey: 'preuvesAr' },
      { key: 'referencesFr', label: t('principesPage.references'), type: 'textarea', enKey: 'referencesEn', arKey: 'referencesAr' },
    ];
  }, [editor, t]);

  const editorInitialData = useMemo<Record<string, string>>(() => {
    if (!editor?.data) {
      const initial: Record<string, string> = {};
      if (editor?.type === 'principe') initial.weight = '1.0';
      return initial;
    }
    const data = editor.data;
    if (editor.type === 'principe') {
      const principe = data as Principe;
      return {
        nameFr: principe.nameFr || '', nameEn: principe.nameEn || '', nameAr: principe.nameAr || '',
        descriptionFr: principe.descriptionFr || '', descriptionEn: principe.descriptionEn || '', descriptionAr: principe.descriptionAr || '',
        weight: String(principe.weight || 1),
      };
    }
    if (editor.type === 'bp') {
      const bp = data as BonnePratique;
      return { labelFr: bp.labelFr || '', labelEn: bp.labelEn || '', labelAr: bp.labelAr || '' };
    }
    const critere = data as Critere;
    return {
      labelFr: critere.labelFr || '', labelEn: critere.labelEn || '', labelAr: critere.labelAr || '',
      preuvesFr: critere.preuvesFr || '', preuvesEn: critere.preuvesEn || '', preuvesAr: critere.preuvesAr || '',
      referencesFr: critere.referencesFr || '', referencesEn: critere.referencesEn || '', referencesAr: critere.referencesAr || '',
    };
  }, [editor]);

  const editorTitle = !editor ? '' : editor.mode === 'create'
    ? t(`principesPage.${editor.type === 'principe' ? 'addPrincipe' : editor.type === 'bp' ? 'addBP' : 'addCritere'}`)
    : t(`principesPage.${editor.type === 'principe' ? 'editPrincipe' : editor.type === 'bp' ? 'editBP' : 'editCritere'}`);

  const handleSave = async (data: Record<string, string>) => {
    if (!editor) return;
    try {
      if (editor.type === 'principe') {
        if (editor.mode === 'create') await referenceDataService.createPrincipe(data);
        else await referenceDataService.updatePrincipe(editor.data!.id, data);
      }
      if (editor.type === 'bp') {
        if (editor.mode === 'create') await referenceDataService.createBonnePratique({ ...data, principeId: editor.parentId! });
        else await referenceDataService.updateBonnePratique(editor.data!.id, data);
      }
      if (editor.type === 'critere') {
        if (editor.mode === 'create') await referenceDataService.createCritere({ ...data, bonnePratiqueId: editor.parentId! });
        else await referenceDataService.updateCritere(editor.data!.id, data);
      }
      toast.success(t('principesPage.saved'));
      await loadPrincipes();
    } catch (error) {
      toast.error(t('principesPage.saveError'));
      throw error;
    }
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-700" /></div>;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('navigation.principes')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('principesPage.subtitle')}</p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setEditor({ type: 'principe', mode: 'create' })} className="btn-primary gap-2">
            <Plus className="h-4 w-4" />
            {t('principesPage.addPrincipe')}
          </button>
        )}
      </header>

      <section className="grid grid-cols-1 border-y border-gray-200 bg-white sm:grid-cols-3 dark:border-[#2b3b35] dark:bg-[#17201d]">
        <ReferenceMetric icon={BookOpen} label={t('principesPage.principlesMetric')} value={principes.length} />
        <ReferenceMetric icon={Layers3} label={t('principesPage.goodPracticesMetric')} value={totalBonnesPratiques} />
        <ReferenceMetric icon={ListChecks} label={t('principesPage.criteriaMetric')} value={totalCriteres} />
      </section>

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="input pl-9" placeholder={t('principesPage.searchPlaceholder')} />
      </div>

      <section className="overflow-hidden border border-gray-200 bg-white dark:border-[#2b3b35] dark:bg-[#17201d]">
        {filteredPrincipes.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">{t('principesPage.noResults')}</div>
        ) : filteredPrincipes.map((principe) => {
          const isExpanded = expandedPrincipe === principe.id;
          const criterionCount = principe.bonnesPratiques.reduce((sum, bp) => sum + bp.criteres.length, 0);
          return (
            <article key={principe.id} className="border-b border-gray-200 last:border-b-0 dark:border-[#2b3b35]">
              <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <button type="button" onClick={() => setExpandedPrincipe(isExpanded ? null : principe.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {isExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 rtl:rotate-180" />}
                  <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary-700 text-sm font-bold text-white">{principe.number}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{getLocalizedField(principe, 'name', language)}</span>
                    <span className="mt-0.5 block text-xs text-gray-500">{t('principesPage.structureCount', { bp: principe.bonnesPratiques.length, criteria: criterionCount })}</span>
                  </span>
                </button>
                {canManage && !principe.isFixed && (
                  <div className="flex items-center gap-1">
                    <IconButton label={t('common.edit')} icon={Edit3} onClick={() => setEditor({ type: 'principe', mode: 'edit', data: principe })} />
                    <IconButton label={t('common.delete')} icon={Trash2} danger onClick={() => void handleDelete('principe', principe.id, getLocalizedField(principe, 'name', language))} />
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 dark:border-[#2b3b35] dark:bg-[#0f1613]">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <h3 className="text-xs font-semibold uppercase text-gray-500">{t('principesPage.bonnesPratiquesList')}</h3>
                    {canManage && (
                      <button type="button" onClick={() => setEditor({ type: 'bp', mode: 'create', parentId: principe.id, contextLabel: getLocalizedField(principe, 'name', language) })} className="btn-outline btn-sm gap-2">
                        <Plus className="h-4 w-4" />{t('principesPage.addBP')}
                      </button>
                    )}
                  </div>

                  {principe.bonnesPratiques.length === 0 ? (
                    <p className="px-5 pb-4 text-sm text-gray-500">{t('principesPage.noGoodPractices')}</p>
                  ) : principe.bonnesPratiques.map((bp) => {
                    const bpExpanded = expandedBP === bp.id;
                    return (
                      <div key={bp.id} className="border-t border-gray-200 bg-white dark:border-[#2b3b35] dark:bg-[#17201d]">
                        <div className="flex items-center gap-3 px-4 py-3 sm:pl-12 sm:pr-5">
                          <button type="button" onClick={() => setExpandedBP(bpExpanded ? null : bp.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            {bpExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 rtl:rotate-180" />}
                            <span className="text-xs font-bold text-primary-700">{bp.number}</span>
                            <span className="truncate text-sm font-medium text-gray-800 dark:text-slate-100">{getLocalizedField(bp, 'label', language)}</span>
                            <span className="flex-shrink-0 text-xs text-gray-400">{t('principesPage.criteres', { count: bp.criteres.length })}</span>
                          </button>
                          {canManage && (
                            <div className="flex items-center gap-1">
                              <IconButton label={t('principesPage.addCritere')} icon={Plus} onClick={() => setEditor({ type: 'critere', mode: 'create', parentId: bp.id, contextLabel: getLocalizedField(bp, 'label', language) })} />
                              <IconButton label={t('common.edit')} icon={Edit3} onClick={() => setEditor({ type: 'bp', mode: 'edit', data: bp, contextLabel: getLocalizedField(principe, 'name', language) })} />
                              <IconButton label={t('common.delete')} icon={Trash2} danger onClick={() => void handleDelete('bp', bp.id, getLocalizedField(bp, 'label', language))} />
                            </div>
                          )}
                        </div>

                        {bpExpanded && (
                          <div className="overflow-x-auto border-t border-gray-100 dark:border-[#2b3b35]">
                            <table className="w-full min-w-[720px] text-sm">
                              <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 dark:bg-[#0f1613] dark:text-slate-400">
                                <tr><th className="w-16 px-4 py-2 sm:pl-16">#</th><th className="px-3 py-2">{t('principesPage.criterionLabel')}</th><th className="px-3 py-2">{t('principesPage.references')}</th>{canManage && <th className="w-24 px-3 py-2 text-right">{t('common.actions')}</th>}</tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-[#2b3b35]">
                                {bp.criteres.map((critere) => (
                                  <tr key={critere.id}>
                                    <td className="px-4 py-3 text-gray-400 sm:pl-16">{critere.number}</td>
                                    <td className="max-w-xl px-3 py-3 align-top">
                                      <p className="font-medium text-gray-800 dark:text-slate-100">{getLocalizedField(critere, 'label', language)}</p>
                                      {getLocalizedField(critere, 'preuves', language) && <p className="mt-1 text-xs leading-5 text-gray-500">{getLocalizedField(critere, 'preuves', language)}</p>}
                                    </td>
                                    <td className="max-w-sm px-3 py-3 align-top text-xs leading-5 text-gray-500">{getLocalizedField(critere, 'references', language) || '-'}</td>
                                    {canManage && (
                                      <td className="px-3 py-3 align-top"><div className="flex justify-end gap-1"><IconButton label={t('common.edit')} icon={Edit3} onClick={() => setEditor({ type: 'critere', mode: 'edit', data: critere, contextLabel: getLocalizedField(bp, 'label', language) })} /><IconButton label={t('common.delete')} icon={Trash2} danger onClick={() => void handleDelete('critere', critere.id, getLocalizedField(critere, 'label', language))} /></div></td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <ReferenceEditor editor={editor} title={editorTitle} fields={editorFields} initialData={editorInitialData} onClose={() => setEditor(null)} onSave={handleSave} />
    </div>
  );
}

function ReferenceMetric({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 dark:border-[#2b3b35]">
      <Icon className="h-5 w-5 text-primary-700" />
      <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-semibold text-gray-900 dark:text-slate-100">{value}</p></div>
    </div>
  );
}

function IconButton({ label, icon: Icon, danger = false, onClick }: { label: string; icon: typeof Edit3; danger?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${danger ? 'text-gray-400 hover:bg-red-50 hover:text-red-600' : 'text-gray-400 hover:bg-gray-100 hover:text-primary-700'}`}>
      <Icon className="h-4 w-4" />
    </button>
  );
}
