import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  language: string;
  direction: 'ltr' | 'rtl';
  toggleSidebar: () => void;
  setLanguage: (lang: string) => void;
  setDirection: (dir: 'ltr' | 'rtl') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      language: 'fr',
      direction: 'ltr',

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setLanguage: (lang) => set({ language: lang }),
      setDirection: (dir) => set({ direction: dir }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'sse-ui',
      partialize: (state) => ({ language: state.language, direction: state.direction, theme: state.theme }),
    }
  )
);
