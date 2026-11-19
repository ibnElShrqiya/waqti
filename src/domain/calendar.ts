import { addDays, isSameDay, startOfDay } from '@/lib/date';
import type { CalendarEvent, Task } from './types';

export interface CalendarDisplayItem {
  id: string;
  kind: 'event' | 'task';
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  event?: CalendarEvent;
  task?: Task;
}

/**
 * Merges calendar events and scheduled tasks without duplicating any task
 * that is already linked to a calendar event via `event.taskId`.
 */
export function buildCalendarItems(events: CalendarEvent[], tasks: Task[]): CalendarDisplayItem[] {
  const linkedTaskIds = new Set(
    events.map((e) => e.taskId).filter((id): id is string => Boolean(id)),
  );
  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const eventItems: CalendarDisplayItem[] = events.map((ev) => ({
    id: `ev:${ev.id}`,
    kind: 'event',
    title: ev.title,
    start: new Date(ev.startAt),
    end: new Date(ev.endAt),
    allDay: ev.allDay,
    color: ev.color,
    event: ev,
    task: ev.taskId ? taskById.get(ev.taskId) : undefined,
  }));

  const taskItems: CalendarDisplayItem[] = tasks
    .filter((t) => !linkedTaskIds.has(t.id) && t.status !== 'deferred')
    .filter((t) => Boolean(t.startAt || t.dueAt))
    .map((t) => {
      const start = new Date(t.startAt ?? t.dueAt!);
      const end = t.endAt
        ? new Date(t.endAt)
        : new Date(start.getTime() + (t.estimatedMinutes ?? 30) * 60_000);
      return {
        id: `task:${t.id}`,
        kind: 'task',
        title: t.title,
        start,
        end,
        allDay: false,
        color: t.priority === 'urgent' ? '#B93C34' : t.priority === 'high' ? '#B27414' : '#176B56',
        task: t,
      };
    });

  return [...eventItems, ...taskItems].sort((a, b) => a.start.getTime() - b.start.getTime());
}

export interface TimeRangeCandidate {
  id?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
}

/** Detects overlapping non-all-day items. */
export function findEventConflicts(
  candidate: TimeRangeCandidate,
  items: CalendarDisplayItem[],
): CalendarDisplayItem[] {
  if (candidate.allDay) return [];
  const cStart = candidate.start.getTime();
  const cEnd = candidate.end.getTime();
  if (cEnd <= cStart) return [];

  return items.filter((item) => {
    if (item.allDay) return false;
    if (candidate.id && (item.id === candidate.id || item.event?.id === candidate.id || item.task?.id === candidate.id)) {
      return false;
    }
    const iStart = item.start.getTime();
    const iEnd = item.end.getTime();
    return cStart < iEnd && cEnd > iStart;
  });
}

export function getItemsForDay(items: CalendarDisplayItem[], day: Date): CalendarDisplayItem[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  return items.filter((item) => {
    if (isSameDay(item.start, day)) return true;
    return item.start.getTime() < dayEnd && item.end.getTime() > dayStart;
  });
}

/** Returns 7 consecutive days starting from Sunday of the week containing `anchor`. */
export function getWeekDays(anchor: Date): Date[] {
  const d = startOfDay(anchor);
  const sunday = addDays(d, -d.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(sunday, i));
}

/** Returns 42 days (6x7 grid) for the month containing `anchor`. */
export function getMonthGridDays(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = addDays(firstOfMonth, -firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** Converts a local YYYY-MM-DD + HH:mm into a UTC ISO string. */
export function localDateTimeToIso(dayKey: string, time: string): string {
  const [y = 0, m = 1, d = 1] = dayKey.split('-').map(Number);
  const [hh = 0, mm = 0] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

/** Formats an ISO timestamp in a specific IANA timezone as HH:mm. */
export function formatTimeInZone(iso: string, timeZone: string, locale = 'en-US'): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
    }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  }
}
