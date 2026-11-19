import type { OfflineSyncOperation, SyncEntityType, SyncOperationKind } from '@/domain/types';
import { offlineDb, type WaqtiOfflineDB } from './db';

export const MAX_SYNC_RETRIES = 5;

export class SyncConflictError extends Error {
  constructor(
    public readonly serverUpdatedAt: string,
    message = 'Server version is newer than offline change.',
  ) {
    super(message);
    this.name = 'SyncConflictError';
  }
}

export function computeBackoffMs(retryCount: number, baseMs = 1000, maxMs = 60_000): number {
  const safe = Math.max(0, retryCount);
  return Math.min(maxMs, baseMs * Math.pow(2, safe));
}

export type SyncExecutor = (op: OfflineSyncOperation) => Promise<void>;

export interface SyncCycleResult {
  processed: number;
  applied: number;
  conflicts: number;
  failed: number;
}

export async function enqueueSyncOperation(
  input: {
    idempotencyKey?: string;
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperationKind;
    payload: Record<string, unknown>;
    clientUpdatedAt?: string;
  },
  db: WaqtiOfflineDB | null = offlineDb,
): Promise<OfflineSyncOperation | null> {
  if (!db) return null;
  const nowIso = new Date().toISOString();
  const idempotencyKey =
    input.idempotencyKey ??
    `${input.entityType}:${input.entityId}:${input.operation}:${input.clientUpdatedAt ?? nowIso}`;

  const existing = await db.syncQueue.where('idempotencyKey').equals(idempotencyKey).first();
  if (existing) return existing;

  const op: OfflineSyncOperation = {
    idempotencyKey,
    entityType: input.entityType,
    entityId: input.entityId,
    operation: input.operation,
    payload: input.payload,
    clientUpdatedAt: input.clientUpdatedAt ?? nowIso,
    status: 'pending',
    retryCount: 0,
    nextRetryAt: 0,
    createdAt: nowIso,
  };

  const id = await db.syncQueue.add(op);
  return { ...op, id };
}

export async function processSyncQueue(
  executor: SyncExecutor,
  db: WaqtiOfflineDB | null = offlineDb,
  nowMs = Date.now(),
): Promise<SyncCycleResult> {
  const summary: SyncCycleResult = { processed: 0, applied: 0, conflicts: 0, failed: 0 };
  if (!db) return summary;

  const due = await db.syncQueue
    .where('status')
    .equals('pending')
    .filter((op) => op.nextRetryAt <= nowMs)
    .sortBy('createdAt');

  for (const op of due) {
    if (!op.id) continue;
    summary.processed += 1;

    try {
      await db.syncQueue.update(op.id, { status: 'syncing' });
      await executor(op);
      await db.syncQueue.update(op.id, { status: 'applied' });
      summary.applied += 1;
    } catch (err) {
      if (err instanceof SyncConflictError) {
        await db.syncQueue.update(op.id, {
          status: 'conflict',
          serverUpdatedAt: err.serverUpdatedAt,
          lastError: err.message,
        });
        summary.conflicts += 1;
      } else {
        const nextRetry = op.retryCount + 1;
        const exhausted = nextRetry >= MAX_SYNC_RETRIES;
        await db.syncQueue.update(op.id, {
          status: exhausted ? 'failed' : 'pending',
          retryCount: nextRetry,
          nextRetryAt: nowMs + computeBackoffMs(nextRetry),
          lastError: err instanceof Error ? err.message : 'Sync failed',
        });
        summary.failed += 1;
      }
    }
  }

  return summary;
}

export async function resolveSyncConflict(
  id: number,
  resolution: 'keep_local' | 'accept_server' | 'dismiss',
  executor: SyncExecutor,
  db: WaqtiOfflineDB | null = offlineDb,
): Promise<void> {
  if (!db) return;
  const op = await db.syncQueue.get(id);
  if (!op) return;

  if (resolution === 'accept_server' || resolution === 'dismiss') {
    await db.syncQueue.update(id, { status: 'applied' });
    return;
  }

  // keep_local: force replay
  await executor({ ...op, clientUpdatedAt: new Date().toISOString() });
  await db.syncQueue.update(id, { status: 'applied' });
}

export async function getSyncQueueCounts(db: WaqtiOfflineDB | null = offlineDb) {
  if (!db) return { pending: 0, conflict: 0, failed: 0 };
  const [pending, conflict, failed] = await Promise.all([
    db.syncQueue.where('status').anyOf(['pending', 'syncing']).count(),
    db.syncQueue.where('status').equals('conflict').count(),
    db.syncQueue.where('status').equals('failed').count(),
  ]);
  return { pending, conflict, failed };
}
