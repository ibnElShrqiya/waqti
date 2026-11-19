import type {
  NotificationItem,
  NotificationPreferences,
  NotificationType,
  QuietHoursConfig,
} from './types';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  settings: {
    tasks: true,
    calendar: true,
    habits: true,
    goals: true,
    focus: true,
    spiritual: false,
    summaries: true,
    leadMinutes: 15,
    dailyLimit: 20,
    sound: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
};

function parseHHmm(value: string): number {
  const [h = 0, m = 0] = value.split(':').map(Number);
  return h * 60 + m;
}

function getMinutesInTimeZone(now: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24;
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    return h * 60 + m;
  } catch {
    return now.getHours() * 60 + now.getMinutes();
  }
}

/**
 * Checks whether `now` falls inside the configured quiet hours in `timeZone`.
 * Supports overnight ranges such as 22:00 -> 07:00 as well as same-day ranges.
 */
export function isWithinQuietHours(
  now: Date,
  quietHours: QuietHoursConfig,
  timeZone: string,
): boolean {
  if (!quietHours.enabled) return false;
  const current = getMinutesInTimeZone(now, timeZone);
  const start = parseHHmm(quietHours.start);
  const end = parseHHmm(quietHours.end);

  if (start === end) return false;
  if (start < end) {
    return current >= start && current < end;
  }
  // Overnight wrap (e.g. 22:00 -> 07:00)
  return current >= start || current < end;
}

export function isCategoryEnabled(type: NotificationType, prefs: NotificationPreferences): boolean {
  const s = prefs.settings;
  if (type === 'task') return s.tasks;
  if (type === 'calendar') return s.calendar;
  if (type === 'habit') return s.habits;
  if (type === 'goal') return s.goals;
  if (type === 'focus') return s.focus;
  if (type === 'spiritual') return s.spiritual;
  return s.summaries;
}

export function shouldDeliverNotification(
  candidate: Pick<NotificationItem, 'type' | 'dedupeKey'>,
  prefs: NotificationPreferences,
  existing: NotificationItem[],
  now: Date,
): boolean {
  if (!isCategoryEnabled(candidate.type, prefs)) return false;
  if (isWithinQuietHours(now, prefs.quietHours, prefs.timezone)) return false;

  if (candidate.dedupeKey && existing.some((n) => n.dedupeKey === candidate.dedupeKey)) {
    return false;
  }

  const todayPrefix = now.toISOString().slice(0, 10);
  const deliveredToday = existing.filter(
    (n) => n.deliveredAt && n.deliveredAt.startsWith(todayPrefix),
  ).length;
  if (deliveredToday >= prefs.settings.dailyLimit) return false;

  return true;
}
