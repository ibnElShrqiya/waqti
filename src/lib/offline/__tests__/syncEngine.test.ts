import { describe, expect, it, vi } from 'vitest';
import type { OfflineSyncOperation } from '@/domain/types';
import type { WaqtiOfflineDB } from '../db';
import {
  computeBackoffMs,
  enqueueSyncOperation,
  getSyncQueueCounts,
  MAX_SYNC_RETRIES,
  processSyncQueue,
  resolveSyncConflict,
  SyncConflictError,
} from '../syncEngine';

function createMockOfflineDb(): WaqtiOfflineDB {
  const rows: OfflineSyncOperation[] = [];
  let seq = 1;

  const table = {
    where(field: keyof OfflineSyncOperation) {
      return {
        equals(val: unknown) {
          const matched = () => rows.filter((r) => r[field] === val);
          return {
            first: async () => matched()[0],
            count: async () => matched().length,
            filter: (fn: (r: OfflineSyncOperation) => boolean) => ({
              sortBy: async () => matched().filter(fn).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
            }),
          };
        },
        anyOf(vals: unknown[]) {
          return {
            count: async () => rows.filter((r) => vals.includes(r[field])).length,
          };
        },
      };
    },
    async add(op: OfflineSyncOperation) {
      const id = seq++;
      rows.push({ ...op, id });
      return id;
    },
    async get(id: number) {
      return rows.find((r) => r.id === id);
    },
    async update(id: number, patch: Partial<OfflineSyncOperation>) {
      const row = rows.find((r) => r.id === id);
      if (row) Object.assign(row, patch);
      return 1;
    },
  };

  return { syncQueue: table } as unknown as WaqtiOfflineDB;
}

describe('offline sync engine', () => {
  it('computes exponential backoff with a 60s cap', () => {
    expect(computeBackoffMs(0)).toBe(1000);
    expect(computeBackoffMs(1)).toBe(2000);
    expect(computeBackoffMs(2)).toBe(4000);
    expect(computeBackoffMs(10)).toBe(60_000);
    expect(MAX_SYNC_RETRIES).toBe(5);
  });

  it('deduplicates idempotent operations and processes pending queue in order', async () => {
    const db = createMockOfflineDb();
    const first = await enqueueSyncOperation(
      {
        idempotencyKey: 'task:1:create',
        entityType: 'task',
        entityId: '1',
        operation: 'create',
        payload: { title: 'Offline Task' },
      },
      db,
    );
    const dup = await enqueueSyncOperation(
      {
        idempotencyKey: 'task:1:create',
        entityType: 'task',
        entityId: '1',
        operation: 'create',
        payload: { title: 'Offline Task' },
      },
      db,
    );
    expect(dup?.id).toBe(first?.id);

    await enqueueSyncOperation(
      {
        idempotencyKey: 'task:2:toggle',
        entityType: 'task',
        entityId: '2',
        operation: 'toggle',
        payload: { completed: true },
      },
      db,
    );

    const executed: string[] = [];
    const res = await processSyncQueue(async (op) => {
      executed.push(op.entityId);
    }, db);

    expect(res).toEqual({ processed: 2, applied: 2, conflicts: 0, failed: 0 });
    expect(executed).toEqual(['1', '2']);
    expect(await getSyncQueueCounts(db)).toEqual({ pending: 0, conflict: 0, failed: 0 });
  });

  it('retries transient failures with backoff and detects/resolves conflicts', async () => {
    const db = createMockOfflineDb();
    const op = await enqueueSyncOperation(
      {
        idempotencyKey: 'task:9:update',
        entityType: 'task',
        entityId: '9',
        operation: 'update',
        payload: { title: 'Edited offline' },
      },
      db,
    );

    // Transient failure schedules retry
    const nowMs = 1_700_000_000_000;
    const failRes = await processSyncQueue(async () => {
      throw new Error('Network timeout');
    }, db, nowMs);
    expect(failRes.failed).toBe(1);
    const afterFail = await db.syncQueue.get(op!.id!);
    expect(afterFail?.status).toBe('pending');
    expect(afterFail?.retryCount).toBe(1);
    expect(afterFail?.nextRetryAt).toBe(nowMs + 2000);

    // Conflict detection when nextRetryAt is reached
    const conflictRes = await processSyncQueue(async () => {
      throw new SyncConflictError('2026-11-19T12:00:00.000Z');
    }, db, nowMs + 3000);
    expect(conflictRes.conflicts).toBe(1);
    expect(await getSyncQueueCounts(db)).toEqual({ pending: 0, conflict: 1, failed: 0 });

    // Conflict resolution: keep_local replays executor and marks applied
    const replay = vi.fn(async () => {});
    await resolveSyncConflict(op!.id!, 'keep_local', replay, db);
    expect(replay).toHaveBeenCalledTimes(1);
    expect(await getSyncQueueCounts(db)).toEqual({ pending: 0, conflict: 0, failed: 0 });
  });
});
