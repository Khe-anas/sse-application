import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import ar from './locales/ar.json';
import en from './locales/en.json';
import { useUIStore } from '@/stores/uiStore';

export const LANGUAGES = [
  { code: 'fr', name: 'Français', dir: 'ltr' as const },
  { code: 'ar', name: 'العربية', dir: 'rtl' as const },
  { code: 'en', name: 'English', dir: 'ltr' as const },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      ar: { translation: ar },
      en: { translation: en },
    },
    lng: useUIStore.getState().language,
    fallbackLng: 'fr',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export const applyLanguage = (lng: string) => {
  const lang = LANGUAGES.find((l) => l.code === lng) ?? LANGUAGES[0];
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.dir;
  const { setLanguage, setDirection } = useUIStore.getState();
  setLanguage(lang.code);
  setDirection(lang.dir);
};

export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
  applyLanguage(lng);
};

// Keep the UI store in sync if i18next changes the language from anywhere else.
i18n.on('languageChanged', (lng) => applyLanguage(lng));

// Apply the persisted language to <html> on first load.
applyLanguage(useUIStore.getState().language);

export default i18n;
