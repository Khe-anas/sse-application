import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';
import type { Principe } from '@/types';
import KPICard from '@/components/dashboard/KPICard';
import { getLocalizedField } from '@/utils/localization';

export default function PrincipesPage() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const [principes, setPrincipes] = useState<Principe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedPrincipe, setExpandedPrincipe] = useState<string | null>(null);
  const [expandedBP, setExpandedBP] = useState<string | null>(null);

  useEffect(() => { loadPrincipes(); }, []);

  const loadPrincipes = async () => {
    try {
      const response = await api.get<Principe[]>('/principes');
      setPrincipes(response.data);
    } catch (error) { toast.error(t('principesPage.loadError')); }
    finally { setIsLoading(false); }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('navigation.principes')}</h1>
      </div>

      <KPICard title={t('principesPage.kpiTitle')} value={principes.length} icon={BookOpen} color="primary" />

      <div className="space-y-3">
        {principes.map((principe) => (
          <div key={principe.id} className="card overflow-hidden">
            <button
              onClick={() => setExpandedPrincipe(expandedPrincipe === principe.id ? null : principe.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold">
                  {principe.number}
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">{getLocalizedField(principe, 'name', language)}</h3>
                  <p className="text-sm text-gray-500">{t('principesPage.bonnesPratiques', { count: principe.bonnesPratiques.length })}</p>
                </div>
              </div>
              {expandedPrincipe === principe.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {expandedPrincipe === principe.id && (
              <div className="border-t border-gray-100 px-4 pb-4">
                {principe.bonnesPratiques.map((bp) => (
                  <div key={bp.id} className="mt-3 ml-14">
                    <button
                      onClick={() => setExpandedBP(expandedBP === bp.id ? null : bp.id)}
                      className="flex items-center gap-2 text-left hover:text-primary-700"
                    >
                      {expandedBP === bp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span className="font-medium text-gray-800">{getLocalizedField(bp, 'label', language)}</span>
                      <span className="text-xs text-gray-400">{t('principesPage.criteres', { count: bp.criteres.length })}</span>
                    </button>

                    {expandedBP === bp.id && (
                      <div className="mt-2 ml-6 space-y-2">
                        {bp.criteres.map((critere) => {
                          const preuves = getLocalizedField(critere, 'preuves', language);

                          return (
                            <div key={critere.id} className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-800">{critere.number}. {getLocalizedField(critere, 'label', language)}</p>
                              {preuves && <p className="text-xs text-gray-500 mt-1">{t('principesPage.preuvesLabel')} {preuves}</p>}
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
    </div>
  );
}
