import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Pencil, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { organismeService } from '@/services/organismeService';
import { TypeOrganisme } from '@/types';
import type { Organisme, PageResponse } from '@/types';
import KPICard from '@/components/dashboard/KPICard';

export default function OrganismesPage() {
  const { t } = useTranslation();
  const [organismes, setOrganismes] = useState<PageResponse<Organisme> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisme | null>(null);
  const [formData, setFormData] = useState<Partial<Organisme>>({ type: TypeOrganisme.PUBLIC });

  const loadOrganismes = useCallback(async () => {
    try {
      const data = await organismeService.getAll({ search: search || undefined });
      setOrganismes(data);
    } catch (error) { toast.error(t('organismesPage.loadError')); }
    finally { setIsLoading(false); }
  }, [search, t]);

  useEffect(() => { loadOrganismes(); }, [loadOrganismes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrg) {
        await organismeService.update(editingOrg.id, formData);
        toast.success(t('organismesPage.updated'));
      } else {
        await organismeService.create(formData);
        toast.success(t('organismesPage.created'));
      }
      setShowModal(false); setEditingOrg(null);
      setFormData({ type: TypeOrganisme.PUBLIC });
      loadOrganismes();
    } catch (error) { toast.error(t('organismesPage.error')); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('organismesPage.deleteConfirm'))) return;
    try { await organismeService.delete(id); toast.success(t('organismesPage.deleted')); loadOrganismes(); }
    catch (error) { toast.error(t('organismesPage.error')); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('navigation.organismes')}</h1>
        <button onClick={() => { setEditingOrg(null); setFormData({ type: TypeOrganisme.PUBLIC }); setShowModal(true); }} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> {t('organismesPage.new')}
        </button>
      </div>

      <KPICard title={t('organismesPage.total')} value={organismes?.totalElements || 0} icon={Building2} color="primary" />

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('organismesPage.searchPlaceholder')} className="input pl-10" />
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead className="table-head"><tr><th className="table-th">{t('common.name')}</th><th className="table-th">{t('common.type')}</th><th className="table-th">{t('common.sector')}</th><th className="table-th">{t('common.address')}</th><th className="table-th">{t('common.contact')}</th><th className="table-th">{t('common.actions')}</th></tr></thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? <tr><td colSpan={6} className="table-td text-center py-8">{t('common.loading')}</td></tr> :
             organismes?.content.length === 0 ? <tr><td colSpan={6} className="table-td text-center py-8">{t('organismesPage.empty')}</td></tr> :
             organismes?.content.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{org.name}</td>
                <td className="table-td"><span className={`badge ${org.type === TypeOrganisme.PUBLIC ? 'bg-blue-100 text-blue-700' : org.type === TypeOrganisme.PRIVE ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{t(`organisme.type.${org.type}`)}</span></td>
                <td className="table-td text-gray-500">{org.sector || '-'}</td>
                <td className="table-td max-w-xs truncate text-gray-500">{org.address || '-'}</td>
                <td className="table-td text-gray-500">
                  <div>{org.email || '-'}</div>
                  {org.phone && <div className="text-xs text-gray-400">{org.phone}</div>}
                </td>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setEditingOrg(org); setFormData({ ...org }); setShowModal(true); }} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(org.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-4">{editingOrg ? t('organismesPage.editTitle') : t('organismesPage.createTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="label">{t('organismesPage.nameLabel')} *</label><input type="text" required className="input" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div><label className="label">{t('organismesPage.typeLabel')} *</label>
                <select className="select" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as TypeOrganisme })}>
                  <option value={TypeOrganisme.PUBLIC}>{t('organisme.type.PUBLIC')}</option><option value={TypeOrganisme.PRIVE}>{t('organisme.type.PRIVE')}</option><option value={TypeOrganisme.SOCIETE_CIVILE}>{t('organisme.type.SOCIETE_CIVILE')}</option>
                </select>
              </div>
              <div><label className="label">{t('organismesPage.sectorLabel')}</label><input type="text" className="input" value={formData.sector || ''} onChange={(e) => setFormData({ ...formData, sector: e.target.value })} /></div>
              <div><label className="label">{t('organismesPage.addressLabel')}</label><textarea rows={3} className="input" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
              <div><label className="label">{t('organismesPage.emailLabel')}</label><input type="email" className="input" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
              <div><label className="label">{t('organismesPage.phoneLabel')}</label><input type="tel" className="input" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">{t('common.cancel')}</button>
                <button type="submit" className="btn-primary">{editingOrg ? t('organismesPage.update') : t('organismesPage.create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
