import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isWithinQuietHours,
  shouldDeliverNotification,
} from '../notifications';
import type { NotificationItem } from '../types';

describe('notifications domain', () => {
  it('evaluates overnight quiet hours in the configured timezone', () => {
    const quiet = { enabled: true, start: '22:00', end: '07:00' };
    const nightUtc = new Date('2026-11-18T23:30:00.000Z');
    const middayUtc = new Date('2026-11-18T12:00:00.000Z');

    expect(isWithinQuietHours(nightUtc, quiet, 'UTC')).toBe(true);
    expect(isWithinQuietHours(middayUtc, quiet, 'UTC')).toBe(false);
    // In Asia/Dubai (UTC+4), 23:30 UTC is 03:30 AM -> still inside 22:00..07:00
    expect(isWithinQuietHours(nightUtc, quiet, 'Asia/Dubai')).toBe(true);
  });

  it('prevents duplicate notifications, respects disabled categories, and enforces daily limit', () => {
    const now = new Date('2026-11-18T12:00:00.000Z');
    const existing: NotificationItem[] = [
      {
        id: 'n1',
        type: 'task',
        title: 'Existing',
        body: '',
        dedupeKey: 'task:123',
        scheduledAt: now.toISOString(),
        deliveredAt: now.toISOString(),
        status: 'delivered',
        createdAt: now.toISOString(),
      },
    ];

    expect(
      shouldDeliverNotification(
        { type: 'task', dedupeKey: 'task:123' },
        DEFAULT_NOTIFICATION_PREFERENCES,
        existing,
        now,
      ),
    ).toBe(false);

    expect(
      shouldDeliverNotification(
        { type: 'spiritual', dedupeKey: 'sp:1' },
        DEFAULT_NOTIFICATION_PREFERENCES, // spiritual is false by default
        existing,
        now,
      ),
    ).toBe(false);

    const cappedPrefs = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      settings: { ...DEFAULT_NOTIFICATION_PREFERENCES.settings, dailyLimit: 1 },
    };
    expect(
      shouldDeliverNotification({ type: 'task', dedupeKey: 'task:999' }, cappedPrefs, existing, now),
    ).toBe(false);
  });
});
