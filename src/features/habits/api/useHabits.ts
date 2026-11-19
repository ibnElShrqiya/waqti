import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type { HabitLog, NewHabitInput, UpdateHabitInput } from '@/domain/types';
import { enqueueSyncOperation } from '@/lib/offline/syncEngine';
import { usePreferences } from '@/stores/preferences';

export function useHabitsList() {
  const locale = usePreferences((s) => s.locale);
  return useQuery({
    queryKey: queryKeys.habits.list(locale),
    queryFn: () => repositories.habits.list(),
    staleTime: 30_000,
  });
}

export function useHabitLogs() {
  const locale = usePreferences((s) => s.locale);
  return useQuery({
    queryKey: queryKeys.habits.logs(locale),
    queryFn: () => repositories.habits.listLogs(),
    staleTime: 30_000,
  });
}

export function useHabitMutations() {
  const qc = useQueryClient();
  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.habits.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const createHabit = useMutation({
    mutationFn: (input: NewHabitInput) => repositories.habits.create(input),
    onSuccess: invalidateAll,
  });

  const updateHabit = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateHabitInput }) =>
      repositories.habits.update(id, patch),
    onSuccess: invalidateAll,
  });

  const deleteHabit = useMutation({
    mutationFn: (id: string) => repositories.habits.delete(id),
    onSuccess: invalidateAll,
  });

  const logProgress = useMutation({
    mutationFn: async ({
      habitId,
      logDate,
      completedCount,
      notes,
    }: {
      habitId: string;
      logDate: string;
      completedCount: number;
      notes?: string;
    }): Promise<HabitLog> => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueueSyncOperation({
          entityType: 'habit_log',
          entityId: `${habitId}:${logDate}`,
          operation: 'update',
          payload: { habitId, logDate, completedCount, notes },
        });
        return {
          id: `offline-${habitId}-${logDate}`,
          habitId,
          logDate,
          completedCount,
          notes,
          completedAt: completedCount > 0 ? new Date().toISOString() : undefined,
        };
      }
      return repositories.habits.logProgress(habitId, logDate, completedCount, notes);
    },
    onSuccess: () => {
      if (typeof navigator === 'undefined' || navigator.onLine) invalidateAll();
    },
  });

  return {
    createHabit,
    updateHabit,
    deleteHabit,
    logProgress,
  };
}
