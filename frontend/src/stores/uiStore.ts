import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  language: string;
  direction: 'ltr' | 'rtl';
  activeAccountId: string | null;
  assistantOpen: boolean;
  toggleSidebar: () => void;
  setLanguage: (lang: string) => void;
  setDirection: (dir: 'ltr' | 'rtl') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  loadThemeForAccount: (accountId: string | null) => void;
  toggleThemeForAccount: (accountId: string) => void;
  loadLanguageForAccount: (accountId: string | null) => void;
  toggleAssistant: () => void;
  closeAssistant: () => void;
}

type Theme = UIState['theme'];
type Direction = UIState['direction'];

const accountThemeKey = (accountId: string) => `sse-theme:${accountId}`;
const accountLanguageKey = (accountId: string) => `sse-language:${accountId}`;
const supportedLanguages = new Set(['fr', 'ar', 'en']);

const normalizeLanguage = (language: string) => supportedLanguages.has(language) ? language : 'fr';
const languageDirection = (language: string): Direction => language === 'ar' ? 'rtl' : 'ltr';

const readAccountTheme = (accountId: string): Theme => {
  const storedTheme = localStorage.getItem(accountThemeKey(accountId));
  return storedTheme === 'dark' ? 'dark' : 'light';
};

const readAccountLanguage = (accountId: string) => {
  const storedLanguage = localStorage.getItem(accountLanguageKey(accountId));
  return normalizeLanguage(storedLanguage || 'fr');
};

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  theme: 'light',
  language: 'fr',
  direction: 'ltr',
  activeAccountId: null,
  assistantOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setLanguage: (lang) => {
    const language = normalizeLanguage(lang);
    const accountId = get().activeAccountId;
    if (accountId) {
      localStorage.setItem(accountLanguageKey(accountId), language);
    }
    set({ language, direction: languageDirection(language) });
  },
  setDirection: (dir) => set({ direction: dir }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  loadThemeForAccount: (accountId) => set({
    theme: accountId ? readAccountTheme(accountId) : 'light',
  }),
  toggleThemeForAccount: (accountId) => set((state) => {
    const theme: Theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(accountThemeKey(accountId), theme);
    return { theme };
  }),
  loadLanguageForAccount: (accountId) => {
    const language = accountId ? readAccountLanguage(accountId) : 'fr';
    set({
      activeAccountId: accountId,
      language,
      direction: languageDirection(language),
    });
  },
  toggleAssistant: () => set((state) => ({ assistantOpen: !state.assistantOpen })),
  closeAssistant: () => set({ assistantOpen: false }),
}));
