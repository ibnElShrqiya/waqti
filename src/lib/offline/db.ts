import Dexie, { type Table } from 'dexie';
import type { OfflineSyncOperation } from '@/domain/types';

export interface CachedSnapshotRecord {
  key: string;
  data: unknown;
  updatedAt: string;
}

export class WaqtiOfflineDB extends Dexie {
  syncQueue!: Table<OfflineSyncOperation, number>;
  cachedSnapshots!: Table<CachedSnapshotRecord, string>;

  constructor(name = 'waqti-offline-db') {
    super(name);
    this.version(1).stores({
      syncQueue: '++id, &idempotencyKey, entityType, entityId, status, nextRetryAt, createdAt',
      cachedSnapshots: 'key, updatedAt',
    });
  }
}

export const isIndexedDbAvailable = typeof indexedDB !== 'undefined';

export const offlineDb: WaqtiOfflineDB | null = isIndexedDbAvailable ? new WaqtiOfflineDB() : null;

export async function cacheOfflineSnapshot(key: string, data: unknown): Promise<void> {
  if (!offlineDb) return;
  try {
    await offlineDb.cachedSnapshots.put({
      key,
      data,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // ignore storage quota errors
  }
}

export async function readOfflineSnapshot<T>(key: string): Promise<T | undefined> {
  if (!offlineDb) return undefined;
  try {
    const rec = await offlineDb.cachedSnapshots.get(key);
    return rec?.data as T | undefined;
  } catch {
    return undefined;
  }
}
