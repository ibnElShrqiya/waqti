import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type { SpiritualActivityType, SpiritualPreferences } from '@/domain/types';

export function useSpiritualPreferences() {
  return useQuery({
    queryKey: queryKeys.spiritual.preferences(),
    queryFn: () => repositories.spiritual.getPreferences(),
    staleTime: 60_000,
  });
}

export function useSpiritualLogs() {
  return useQuery({
    queryKey: queryKeys.spiritual.logs(),
    queryFn: () => repositories.spiritual.listLogs(),
    staleTime: 30_000,
  });
}

export function useSpiritualMutations() {
  const qc = useQueryClient();
  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.spiritual.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const updatePreferences = useMutation({
    mutationFn: (prefs: SpiritualPreferences) => repositories.spiritual.updatePreferences(prefs),
    onSuccess: invalidateAll,
  });

  const logActivity = useMutation({
    mutationFn: (params: {
      activityType: SpiritualActivityType;
      activityDate: string;
      activityData: Record<string, unknown>;
      completed?: boolean;
    }) => repositories.spiritual.logActivity(params),
    onSuccess: invalidateAll,
  });

  return { updatePreferences, logActivity };
}
