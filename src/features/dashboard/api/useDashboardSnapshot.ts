import { useQuery } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type { DashboardSnapshot } from '@/domain/types';
import { toDayKey } from '@/lib/date';
import { cacheOfflineSnapshot, readOfflineSnapshot } from '@/lib/offline/db';
import { usePreferences } from '@/stores/preferences';

/** Loads the dashboard snapshot for today through the active repository, with offline IndexedDB fallback. */
export function useDashboardSnapshot<T = DashboardSnapshot>(select?: (s: DashboardSnapshot) => T) {
  const locale = usePreferences((s) => s.locale);
  const dayKey = toDayKey(new Date());
  const cacheKey = `dashboard:${dayKey}:${locale}`;

  return useQuery({
    queryKey: queryKeys.dashboard.day(dayKey, locale),
    queryFn: async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = await readOfflineSnapshot<DashboardSnapshot>(cacheKey);
        if (cached) return cached;
      }
      const fresh = await repositories.dashboard.getSnapshot(new Date());
      void cacheOfflineSnapshot(cacheKey, fresh);
      return fresh;
    },
    staleTime: 60_000,
    placeholderData: (previous) => previous,
    select,
  });
}
