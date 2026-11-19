import { useEffect } from 'react';
import { LOCALES } from '@/i18n/config';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { usePreferences } from '@/stores/preferences';

const THEME_COLORS = { light: '#F5F2EA', dark: '#111816' } as const;

/** Resolves the effective theme ("system" follows the OS). */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = usePreferences((s) => s.theme);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}

/**
 * Keeps <html> in sync with preferences: `.dark` class, `lang`, `dir` and the
 * browser theme-color. Mount once near the root.
 */
export function DocumentSync() {
  const resolved = useResolvedTheme();
  const locale = usePreferences((s) => s.locale);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[resolved]);
  }, [resolved]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = LOCALES[locale].dir;
  }, [locale]);

  return null;
}
