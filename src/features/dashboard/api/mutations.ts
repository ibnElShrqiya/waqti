import { useMutation, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type { DashboardSnapshot, HabitSummary, NewTaskInput, Task } from '@/domain/types';

type SnapshotUpdater = (s: DashboardSnapshot) => DashboardSnapshot;

function useSnapshotCache() {
  const qc = useQueryClient();
  const patch = (updater: SnapshotUpdater) =>
    qc.setQueriesData<DashboardSnapshot>({ queryKey: queryKeys.dashboard.all }, (s) => (s ? updater(s) : s));
  const snapshot = () => qc.getQueriesData<DashboardSnapshot>({ queryKey: queryKeys.dashboard.all });
  const restore = (entries: ReturnType<typeof snapshot>) => entries.forEach(([key, data]) => qc.setQueryData(key, data));
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
  };
  const cancel = () => qc.cancelQueries({ queryKey: queryKeys.dashboard.all });
  return { patch, snapshot, restore, invalidate, cancel };
}

export function useCreateTask() {
  const cache = useSnapshotCache();
  return useMutation({
    mutationFn: (input: NewTaskInput) => repositories.tasks.create(input),
    onSuccess: (task: Task) => {
      cache.patch((s) => ({ ...s, tasks: [...s.tasks, task] }));
      void cache.invalidate();
    },
  });
}

/** Optimistically toggles task completion, rolling back on failure. */
export function useToggleTask() {
  const cache = useSnapshotCache();
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      repositories.tasks.setCompleted(id, completed),
    onMutate: async ({ id, completed }) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.patch((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === id
            ? { ...t, status: completed ? 'completed' : 'todo', completedAt: completed ? new Date().toISOString() : undefined }
            : t,
        ),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) cache.restore(context.previous);
    },
    onSettled: () => void cache.invalidate(),
  });
}

/** Optimistically toggles today's habit completion. */
export function useToggleHabit() {
  const cache = useSnapshotCache();
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => repositories.habits.setDoneToday(id, done),
    onMutate: async ({ id, done }) => {
      await cache.cancel();
      const previous = cache.snapshot();
      cache.patch((s) => ({
        ...s,
        habits: s.habits.map((h): HabitSummary => {
          if (h.id !== id || h.completedToday === done) return h;
          return {
            ...h,
            completedToday: done,
            streak: Math.max(0, h.streak + (done ? 1 : -1)),
            lastSevenDays: [...h.lastSevenDays.slice(0, -1), done],
          };
        }),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context) cache.restore(context.previous);
    },
    onSettled: () => void cache.invalidate(),
  });
}
