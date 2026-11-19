import { LOCALES } from './config';
import type { Translator } from './translate';
import type { Locale } from './types';

export interface Formatters {
  /** e.g. "Wednesday, November 18" / "الأربعاء، 18 نوفمبر" */
  longDate: (date: Date) => string;
  /** e.g. "Nov 18" */
  shortDate: (date: Date) => string;
  /** Hijri (Umm al-Qura) date, e.g. "7 Jumada II 1448 AH" */
  hijriDate: (date: Date) => string;
  /** e.g. "9:30 AM" / "9:30 ص" */
  time: (date: Date) => string;
  /** Narrow weekday, e.g. "M" / "ن" */
  weekdayNarrow: (date: Date) => string;
  /** Short weekday, e.g. "Mon" */
  weekdayShort: (date: Date) => string;
  number: (value: number) => string;
  /** ratio in [0,1] → "64%" */
  percent: (ratio: number) => string;
  /** minutes → "1h 25m" / "45 min" */
  duration: (minutes: number) => string;
  /** "Today" / "Tomorrow" / short date */
  relativeDay: (date: Date, now?: Date) => string;
}

export function createFormatters(locale: Locale, { t }: Pick<Translator, 't'>): Formatters {
  const tag = LOCALES[locale].intl;
  const longDate = new Intl.DateTimeFormat(tag, { weekday: 'long', month: 'long', day: 'numeric' });
  const shortDate = new Intl.DateTimeFormat(tag, { month: 'short', day: 'numeric' });
  const hijri = new Intl.DateTimeFormat(`${locale === 'ar' ? 'ar' : 'en'}-u-ca-islamic-umalqura-nu-latn`, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = new Intl.DateTimeFormat(tag, { hour: 'numeric', minute: '2-digit' });
  const weekdayNarrow = new Intl.DateTimeFormat(tag, { weekday: 'narrow' });
  const weekdayShort = new Intl.DateTimeFormat(tag, { weekday: 'short' });
  const number = new Intl.NumberFormat(tag);
  const percent = new Intl.NumberFormat(tag, { style: 'percent', maximumFractionDigits: 0 });

  const duration = (minutes: number): string => {
    const safe = Math.max(0, Math.round(minutes));
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    if (h === 0) return t('common.minutes', { n: number.format(m) });
    if (m === 0) return t('common.hours', { h: number.format(h) });
    return t('common.hoursMinutes', { h: number.format(h), m: number.format(m) });
  };

  const relativeDay = (date: Date, now = new Date()): string => {
    const startA = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const startB = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diff = Math.round((startA - startB) / 86_400_000);
    if (diff === 0) return t('common.today');
    if (diff === 1) return t('common.tomorrow');
    return shortDate.format(date);
  };

  return {
    longDate: (d) => longDate.format(d),
    shortDate: (d) => shortDate.format(d),
    hijriDate: (d) => hijri.format(d),
    time: (d) => time.format(d),
    weekdayNarrow: (d) => weekdayNarrow.format(d),
    weekdayShort: (d) => weekdayShort.format(d),
    number: (v) => number.format(v),
    percent: (r) => percent.format(Number.isFinite(r) ? r : 0),
    duration,
    relativeDay,
  };
}
