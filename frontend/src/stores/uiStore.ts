import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  language: string;
  direction: 'ltr' | 'rtl';
  assistantOpen: boolean;
  toggleSidebar: () => void;
  setLanguage: (lang: string) => void;
  setDirection: (dir: 'ltr' | 'rtl') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  loadThemeForAccount: (accountId: string | null) => void;
  toggleThemeForAccount: (accountId: string) => void;
  toggleAssistant: () => void;
  closeAssistant: () => void;
}

type Theme = UIState['theme'];

const accountThemeKey = (accountId: string) => `sse-theme:${accountId}`;

const readAccountTheme = (accountId: string): Theme => {
  const storedTheme = localStorage.getItem(accountThemeKey(accountId));
  return storedTheme === 'dark' ? 'dark' : 'light';
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      language: 'fr',
      direction: 'ltr',
      assistantOpen: false,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setLanguage: (lang) => set({ language: lang }),
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
      toggleAssistant: () => set((state) => ({ assistantOpen: !state.assistantOpen })),
      closeAssistant: () => set({ assistantOpen: false }),
    }),
    {
      name: 'sse-ui',
      version: 2,
      migrate: (persistedState) => {
        const stored = persistedState as Partial<UIState>;
        return {
          language: stored.language || 'fr',
          direction: stored.direction || 'ltr',
        };
      },
      partialize: (state) => ({ language: state.language, direction: state.direction }),
    }
  )
);
