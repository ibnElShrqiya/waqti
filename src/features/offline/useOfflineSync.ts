import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type { OfflineSyncOperation } from '@/domain/types';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { offlineDb } from '@/lib/offline/db';
import {
  getSyncQueueCounts,
  processSyncQueue,
  resolveSyncConflict,
  SyncConflictError,
  type SyncExecutor,
} from '@/lib/offline/syncEngine';

const executeOfflineOp: SyncExecutor = async (op: OfflineSyncOperation) => {
  const p = op.payload;

  if (op.entityType === 'task') {
    if (op.operation === 'create') {
      await repositories.tasks.create(p as unknown as Parameters<typeof repositories.tasks.create>[0]);
      return;
    }
    if (op.operation === 'toggle') {
      await repositories.tasks.setCompleted(op.entityId, Boolean(p.completed));
      return;
    }
    if (op.operation === 'update') {
      // Check server timestamp for conflict when available
      const tasks = await repositories.tasks.list();
      const serverTask = tasks.find((t) => t.id === op.entityId);
      if (serverTask && serverTask.updatedAt > op.clientUpdatedAt) {
        throw new SyncConflictError(serverTask.updatedAt);
      }
      await repositories.tasks.update(op.entityId, p as unknown as Parameters<typeof repositories.tasks.update>[1]);
      return;
    }
    if (op.operation === 'delete') {
      await repositories.tasks.delete(op.entityId);
    }
  } else if (op.entityType === 'habit_log') {
    await repositories.habits.logProgress(
      String(p.habitId),
      String(p.logDate),
      Number(p.completedCount ?? 1),
      typeof p.notes === 'string' ? p.notes : undefined,
    );
  } else if (op.entityType === 'calendar_event') {
    if (op.operation === 'create') {
      await repositories.calendar.createEvent(
        p as unknown as Parameters<typeof repositories.calendar.createEvent>[0],
      );
    } else if (op.operation === 'delete') {
      await repositories.calendar.deleteEvent(op.entityId);
    }
  } else if (op.entityType === 'goal_milestone') {
    await repositories.goals.updateMilestone(
      op.entityId,
      p as unknown as Parameters<typeof repositories.goals.updateMilestone>[1],
    );
  }
};

export function useOfflineSync() {
  const online = useOnlineStatus();
  const qc = useQueryClient();
  const [counts, setCounts] = useState({ pending: 0, conflict: 0, failed: 0 });
  const [conflicts, setConflicts] = useState<OfflineSyncOperation[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refreshCounts = useCallback(async () => {
    const next = await getSyncQueueCounts();
    setCounts(next);
    if (offlineDb) {
      const conflictItems = await offlineDb.syncQueue.where('status').equals('conflict').toArray();
      setConflicts(conflictItems);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      const res = await processSyncQueue(executeOfflineOp);
      if (res.applied > 0) {
        void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
        void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
        void qc.invalidateQueries({ queryKey: queryKeys.habits.all });
        void qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
        void qc.invalidateQueries({ queryKey: queryKeys.goals.all });
      }
      await refreshCounts();
    } finally {
      setSyncing(false);
    }
  }, [online, syncing, qc, refreshCounts]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    if (online) {
      void syncNow();
    }
  }, [online, syncNow]);

  const handleResolveConflict = useCallback(
    async (id: number, resolution: 'keep_local' | 'accept_server' | 'dismiss') => {
      await resolveSyncConflict(id, resolution, executeOfflineOp);
      await refreshCounts();
      void qc.invalidateQueries();
    },
    [refreshCounts, qc],
  );

  return {
    online,
    syncing,
    pendingCount: counts.pending,
    conflictCount: counts.conflict,
    failedCount: counts.failed,
    conflicts,
    syncNow,
    resolveConflict: handleResolveConflict,
  };
}
