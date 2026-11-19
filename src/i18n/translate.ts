import { LOCALES } from './config';
import { ar } from './locales/ar';
import { en } from './locales/en';
import type { Locale, MessageKey, Messages, PluralForms, PluralKey, TranslationVars } from './types';

export const dictionaries: Record<Locale, Messages> = { en, ar };

function lookup(dict: Messages, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[part];
    return undefined;
  }, dict);
}

function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export interface Translator {
  locale: Locale;
  /** Translate a string key. Falls back to English, then to the key itself. */
  t: (key: MessageKey, vars?: TranslationVars) => string;
  /** Translate a plural key using Intl.PluralRules for the active locale. */
  tp: (key: PluralKey, count: number, vars?: TranslationVars) => string;
}

export function createTranslator(locale: Locale): Translator {
  const dict = dictionaries[locale];
  const intl = LOCALES[locale].intl;
  const plurals = new Intl.PluralRules(intl);
  const numbers = new Intl.NumberFormat(intl);

  const resolve = (key: string): unknown => lookup(dict, key) ?? lookup(dictionaries.en, key);

  const t: Translator['t'] = (key, vars) => {
    const value = resolve(key);
    if (typeof value !== 'string') {
      if (import.meta.env.DEV) console.warn(`[i18n] Missing string for "${key}" (${locale})`);
      return key;
    }
    return interpolate(value, vars);
  };

  const tp: Translator['tp'] = (key, count, vars) => {
    const forms = resolve(key) as PluralForms | undefined;
    if (!forms || typeof forms !== 'object') {
      if (import.meta.env.DEV) console.warn(`[i18n] Missing plural for "${key}" (${locale})`);
      return key;
    }
    const category = plurals.select(count);
    const template = forms[category] ?? forms.other;
    return interpolate(template, { count: numbers.format(count), ...vars });
  };

  return { locale, t, tp };
}
