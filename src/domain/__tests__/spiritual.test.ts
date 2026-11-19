import { describe, expect, it } from 'vitest';
import { AUTHENTIC_AZKAR, computeQuranStats, getPrayerStateForDay } from '../spiritual';
import type { SpiritualLog } from '../types';

describe('spiritual domain', () => {
  const today = new Date(2026, 10, 18, 12, 0, 0);
  const logs: SpiritualLog[] = [
    {
      id: '1',
      activityType: 'quran',
      activityDate: '2026-11-18',
      activityData: { pages: 4 },
      createdAt: today.toISOString(),
    },
    {
      id: '2',
      activityType: 'quran',
      activityDate: '2026-11-14',
      activityData: { pages: 6 },
      createdAt: today.toISOString(),
    },
    {
      id: '3',
      activityType: 'prayer',
      activityDate: '2026-11-18',
      activityData: { prayer: 'fajr', completed: true },
      createdAt: today.toISOString(),
    },
  ];

  it('calculates Quran reading stats and daily completion', () => {
    const stats = computeQuranStats(logs, today, 4);
    expect(stats.pagesToday).toBe(4);
    expect(stats.pagesWeek).toBe(10);
    expect(stats.completedToday).toBe(true);
  });

  it('tracks per-day prayer checklist and includes verified Azkar references', () => {
    const prayers = getPrayerStateForDay(logs, '2026-11-18');
    expect(prayers.fajr).toBe(true);
    expect(prayers.dhuhr).toBe(false);
    expect(AUTHENTIC_AZKAR.every((z) => z.arabic.length > 0 && z.reference.length > 0)).toBe(true);
  });
});
