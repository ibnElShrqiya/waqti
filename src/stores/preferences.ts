import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { detectLocale } from '@/i18n/config';
import type { Locale } from '@/i18n/types';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface PreferencesState {
  theme: ThemePreference;
  locale: Locale;
  sidebarCollapsed: boolean;
  spiritualEnabled: boolean;
  setTheme: (theme: ThemePreference) => void;
  setLocale: (locale: Locale) => void;
  toggleSidebar: () => void;
  setSpiritualEnabled: (enabled: boolean) => void;
}

/**
 * Device-local UI preferences.
 * Phase 2 will mirror these into the `user_preferences` table for signed-in users.
 * The storage key is also read by the inline boot script in index.html.
 */
export const PREFERENCES_STORAGE_KEY = 'waqti.preferences';

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      locale: detectLocale(),
      sidebarCollapsed: false,
      spiritualEnabled: true,
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSpiritualEnabled: (spiritualEnabled) => set({ spiritualEnabled }),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, locale, sidebarCollapsed, spiritualEnabled }) => ({
        theme,
        locale,
        sidebarCollapsed,
        spiritualEnabled,
      }),
    },
  ),
);
