import type { en } from './locales/en';

export type Locale = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

/** Turns the literal English dictionary into the shape every locale must satisfy. */
type Widen<T> = T extends string
  ? string
  : T extends { other: string }
    ? PluralForms
    : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof en>;

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;

/** Dotted keys that resolve to plain strings, e.g. "nav.dashboard". */
export type MessageKey<T = typeof en, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? Join<P, K>
    : T[K] extends { other: string }
      ? never
      : MessageKey<T[K], Join<P, K>>;
}[keyof T & string];

/** Dotted keys that resolve to plural forms, e.g. "dashboard.habits.streak". */
export type PluralKey<T = typeof en, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? never
    : T[K] extends { other: string }
      ? Join<P, K>
      : PluralKey<T[K], Join<P, K>>;
}[keyof T & string];

export type TranslationVars = Record<string, string | number>;
