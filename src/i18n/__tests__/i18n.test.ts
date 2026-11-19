import { describe, expect, it } from 'vitest';
import { createTranslator } from '../translate';
import { createFormatters } from '../format';

describe('i18n translation & formatting', () => {
  it('translates English and Arabic strings with interpolation', () => {
    const en = createTranslator('en');
    const ar = createTranslator('ar');

    expect(en.t('greeting.morning', { name: 'Sara' })).toBe('Good morning, Sara');
    expect(ar.t('greeting.morning', { name: 'سارة' })).toBe('صباح الخير، سارة');
  });

  it('handles Arabic plural categories (zero, one, two, few, many)', () => {
    const ar = createTranslator('ar');
    expect(ar.tp('dashboard.progress.remaining', 0)).toBe('لا مهام متبقية اليوم');
    expect(ar.tp('dashboard.progress.remaining', 1)).toBe('مهمة واحدة متبقية اليوم');
    expect(ar.tp('dashboard.progress.remaining', 2)).toBe('مهمتان متبقيتان اليوم');
    expect(ar.tp('dashboard.progress.remaining', 4)).toContain('4 مهام');
  });

  it('formats durations in both locales', () => {
    const enFmt = createFormatters('en', createTranslator('en'));
    const arFmt = createFormatters('ar', createTranslator('ar'));

    expect(enFmt.duration(95)).toBe('1h 35m');
    expect(arFmt.duration(45)).toBe('45 د');
  });
});
