import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type { NewTaskInput, Task, UpdateTaskInput } from '@/domain/types';
import { cacheOfflineSnapshot, readOfflineSnapshot } from '@/lib/offline/db';
import { enqueueSyncOperation } from '@/lib/offline/syncEngine';
import { usePreferences } from '@/stores/preferences';

export function useTasksList() {
  const locale = usePreferences((s) => s.locale);
  const cacheKey = `tasks:list:${locale}`;

  return useQuery({
    queryKey: queryKeys.tasks.list(locale),
    queryFn: async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cached = await readOfflineSnapshot<Task[]>(cacheKey);
        if (cached) return cached;
      }
      const fresh = await repositories.tasks.list();
      void cacheOfflineSnapshot(cacheKey, fresh);
      return fresh;
    },
    staleTime: 30_000,
  });
}

export function useCategoriesList() {
  const locale = usePreferences((s) => s.locale);
  return useQuery({
    queryKey: queryKeys.categories.list(locale),
    queryFn: () => repositories.categories.list(),
    staleTime: 60_000,
  });
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const locale = usePreferences((s) => s.locale);
  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const createTask = useMutation({
    mutationFn: async (input: NewTaskInput): Promise<Task> => {
      if (isOffline()) {
        const tempId = `offline-${Date.now()}`;
        const nowIso = new Date().toISOString();
        await enqueueSyncOperation({
          entityType: 'task',
          entityId: tempId,
          operation: 'create',
          payload: input as unknown as Record<string, unknown>,
          clientUpdatedAt: nowIso,
        });
        const optimistic: Task = {
          id: tempId,
          title: input.title,
          notes: input.notes,
          status: input.status ?? 'todo',
          priority: input.priority,
          categoryId: input.categoryId,
          tags: input.tags ?? [],
          dueAt: input.dueAt,
          startAt: input.startAt,
          endAt: input.endAt,
          estimatedMinutes: input.estimatedMinutes,
          recurrence: input.recurrence,
          subtasks: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        qc.setQueryData<Task[]>(queryKeys.tasks.list(locale), (prev) => [optimistic, ...(prev ?? [])]);
        return optimistic;
      }
      return repositories.tasks.create(input);
    },
    onSuccess: () => {
      if (!isOffline()) invalidateAll();
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateTaskInput }): Promise<Task> => {
      if (isOffline()) {
        const nowIso = new Date().toISOString();
        await enqueueSyncOperation({
          entityType: 'task',
          entityId: id,
          operation: 'update',
          payload: patch as unknown as Record<string, unknown>,
          clientUpdatedAt: nowIso,
        });
        const list = qc.getQueryData<Task[]>(queryKeys.tasks.list(locale)) ?? [];
        const existing = list.find((t) => t.id === id);
        const updated: Task = {
          ...(existing ?? {
            id,
            title: patch.title ?? '',
            status: patch.status ?? 'todo',
            priority: patch.priority ?? 'medium',
            tags: [],
            createdAt: nowIso,
          }),
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
          updatedAt: nowIso,
        };
        qc.setQueryData<Task[]>(queryKeys.tasks.list(locale), (prev) =>
          (prev ?? []).map((t) => (t.id === id ? updated : t)),
        );
        return updated;
      }
      return repositories.tasks.update(id, patch);
    },
    onSuccess: () => {
      if (!isOffline()) invalidateAll();
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      if (isOffline()) {
        await enqueueSyncOperation({
          entityType: 'task',
          entityId: id,
          operation: 'delete',
          payload: {},
        });
        qc.setQueryData<Task[]>(queryKeys.tasks.list(locale), (prev) =>
          (prev ?? []).filter((t) => t.id !== id),
        );
        return;
      }
      return repositories.tasks.delete(id);
    },
    onSuccess: () => {
      if (!isOffline()) invalidateAll();
    },
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }): Promise<Task> => {
      if (isOffline()) {
        const nowIso = new Date().toISOString();
        await enqueueSyncOperation({
          entityType: 'task',
          entityId: id,
          operation: 'toggle',
          payload: { completed },
          clientUpdatedAt: nowIso,
        });
        const list = qc.getQueryData<Task[]>(queryKeys.tasks.list(locale)) ?? [];
        const existing = list.find((t) => t.id === id);
        const updated: Task = {
          ...(existing ?? {
            id,
            title: '',
            priority: 'medium',
            tags: [],
            createdAt: nowIso,
          }),
          status: completed ? 'completed' : 'todo',
          completedAt: completed ? nowIso : undefined,
          updatedAt: nowIso,
        };
        qc.setQueryData<Task[]>(queryKeys.tasks.list(locale), (prev) =>
          (prev ?? []).map((t) => (t.id === id ? updated : t)),
        );
        return updated;
      }
      return repositories.tasks.setCompleted(id, completed);
    },
    onSuccess: () => {
      if (!isOffline()) invalidateAll();
    },
  });

  const addSubtask = useMutation({
    mutationFn: ({ taskId, title }: { taskId: string; title: string }) =>
      repositories.tasks.addSubtask(taskId, title),
    onSuccess: invalidateAll,
  });

  const toggleSubtask = useMutation({
    mutationFn: ({ subtaskId, completed }: { subtaskId: string; completed: boolean }) =>
      repositories.tasks.toggleSubtask(subtaskId, completed),
    onSuccess: invalidateAll,
  });

  const deleteSubtask = useMutation({
    mutationFn: (subtaskId: string) => repositories.tasks.deleteSubtask(subtaskId),
    onSuccess: invalidateAll,
  });

  const createCategory = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      repositories.categories.create(name, color),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.categories.all }),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => repositories.categories.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
      invalidateAll();
    },
  });

  return {
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    createCategory,
    deleteCategory,
  };
}
