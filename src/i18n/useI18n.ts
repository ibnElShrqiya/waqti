import { useMemo } from 'react';
import { usePreferences } from '@/stores/preferences';
import { LOCALES } from './config';
import { createFormatters, type Formatters } from './format';
import { createTranslator, type Translator } from './translate';
import type { Direction, Locale } from './types';

export interface I18n extends Translator {
  dir: Direction;
  isRTL: boolean;
  fmt: Formatters;
  setLocale: (locale: Locale) => void;
}

/** Access translations, direction and locale-aware formatters. */
export function useI18n(): I18n {
  const locale = usePreferences((s) => s.locale);
  const setLocale = usePreferences((s) => s.setLocale);

  return useMemo(() => {
    const translator = createTranslator(locale);
    const dir = LOCALES[locale].dir;
    return {
      ...translator,
      dir,
      isRTL: dir === 'rtl',
      fmt: createFormatters(locale, translator),
      setLocale,
    };
  }, [locale, setLocale]);
}
