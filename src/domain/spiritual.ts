import { addDays, toDayKey } from '@/lib/date';
import type { SpiritualLog, SpiritualPreferences } from './types';

export const DEFAULT_SPIRITUAL_PREFERENCES: SpiritualPreferences = {
  enabled: true,
  settings: {
    dailyQuranPages: 4,
    prayerMethod: 'unconfigured',
    locationLabel: '',
    shareWithAi: false,
  },
};

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerName = (typeof PRAYERS)[number];

export type AzkarPeriod = 'morning' | 'evening' | 'post_prayer';

export interface AuthenticZikr {
  id: string;
  period: AzkarPeriod;
  arabic: string;
  reference: string;
  targetCount: number;
}

/**
 * Verified authentic Azkar with classical Hadith references.
 * Never AI-generated.
 */
export const AUTHENTIC_AZKAR: AuthenticZikr[] = [
  {
    id: 'morning-ayat-kursi',
    period: 'morning',
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    reference: 'البقرة: ٢٥٥ · رواه النسائي',
    targetCount: 1,
  },
  {
    id: 'morning-sayyid-istighfar',
    period: 'morning',
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
    reference: 'صحيح البخاري (٦٣٠٦)',
    targetCount: 1,
  },
  {
    id: 'evening-hasbiyallah',
    period: 'evening',
    arabic: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    reference: 'التوبة: ١٢٩ · سنن أبي داود (٥٠٨١)',
    targetCount: 7,
  },
  {
    id: 'evening-bismillah',
    period: 'evening',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    reference: 'سنن أبي داود (٥٠٨٨) · صحيح',
    targetCount: 3,
  },
  {
    id: 'post-prayer-tasbih',
    period: 'post_prayer',
    arabic: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَاللَّهُ أَكْبَرُ (ثلاثًا وثلاثين)',
    reference: 'صحيح مسلم (٥٩٧)',
    targetCount: 33,
  },
  {
    id: 'post-prayer-istighfar',
    period: 'post_prayer',
    arabic: 'أَسْتَغْفِرُ اللَّهَ (ثلاثًا) اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    reference: 'صحيح مسلم (٥٩١)',
    targetCount: 1,
  },
];

export function computeQuranStats(logs: SpiritualLog[], today: Date, dailyTarget: number) {
  const todayKey = toDayKey(today);
  const weekCutoff = toDayKey(addDays(today, -6));
  const monthCutoff = toDayKey(addDays(today, -29));

  const quranLogs = logs.filter((l) => l.activityType === 'quran');
  let pagesToday = 0;
  let pagesWeek = 0;
  let pagesMonth = 0;

  for (const log of quranLogs) {
    const pages = Number(log.activityData.pages ?? 0);
    if (log.activityDate === todayKey) pagesToday += pages;
    if (log.activityDate >= weekCutoff) pagesWeek += pages;
    if (log.activityDate >= monthCutoff) pagesMonth += pages;
  }

  return {
    pagesToday,
    pagesWeek,
    pagesMonth,
    dailyTarget,
    completedToday: dailyTarget > 0 && pagesToday >= dailyTarget,
  };
}

export function getPrayerStateForDay(logs: SpiritualLog[], dayKey: string): Record<PrayerName, boolean> {
  const state: Record<PrayerName, boolean> = {
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  };
  for (const log of logs) {
    if (log.activityType === 'prayer' && log.activityDate === dayKey) {
      const prayer = log.activityData.prayer as PrayerName | undefined;
      if (prayer && prayer in state) {
        state[prayer] = Boolean(log.activityData.completed);
      }
    }
  }
  return state;
}
