import type { Direction, Locale } from './types';

export interface LocaleConfig {
  code: Locale;
  dir: Direction;
  /** BCP-47 tag used for Intl formatting. Arabic uses Latin digits for readability. */
  intl: string;
  /** Native name, shown in language switchers. */
  nativeName: string;
}

export const LOCALES: Record<Locale, LocaleConfig> = {
  en: { code: 'en', dir: 'ltr', intl: 'en-US', nativeName: 'English' },
  ar: { code: 'ar', dir: 'rtl', intl: 'ar-u-nu-latn', nativeName: 'العربية' },
};

export const SUPPORTED_LOCALES = Object.keys(LOCALES) as Locale[];

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
}
