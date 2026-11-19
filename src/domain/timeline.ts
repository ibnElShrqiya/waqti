import { isSameDay } from '@/lib/date';
import type { Priority, ScheduleEntry, ScheduleEntryKind, Task } from './types';

export type TimelineKind = 'task' | ScheduleEntryKind;

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  title: string;
  start: Date;
  end?: Date;
  done: boolean;
  /** Present for task items so they can be completed from the timeline. */
  taskId?: string;
  priority?: Priority;
}

export interface BuildTimelineOptions {
  includeSpiritual: boolean;
}

/** Merge scheduled tasks and schedule entries for a given day, ordered by start. */
export function buildTimeline(
  tasks: Task[],
  entries: ScheduleEntry[],
  day: Date,
  { includeSpiritual }: BuildTimelineOptions,
): TimelineItem[] {
  const taskItems: TimelineItem[] = tasks
    .filter((t) => t.startAt && t.status !== 'deferred' && isSameDay(new Date(t.startAt), day))
    .map((t) => ({
      id: `task:${t.id}`,
      kind: 'task',
      title: t.title,
      start: new Date(t.startAt!),
      end: t.endAt ? new Date(t.endAt) : undefined,
      done: t.status === 'completed',
      taskId: t.id,
      priority: t.priority,
    }));

  const entryItems: TimelineItem[] = entries
    .filter((e) => includeSpiritual || !e.spiritual)
    .filter((e) => isSameDay(new Date(e.startAt), day))
    .map((e) => ({
      id: `${e.kind}:${e.id}`,
      kind: e.kind,
      title: e.title,
      start: new Date(e.startAt),
      end: e.endAt ? new Date(e.endAt) : undefined,
      done: Boolean(e.done),
    }));

  return [...taskItems, ...entryItems].sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Index of the first item that has not yet ended — where the "now" marker goes. */
export function findNowIndex(items: TimelineItem[], now: Date): number {
  const t = now.getTime();
  const idx = items.findIndex((item) => (item.end ?? item.start).getTime() > t);
  return idx === -1 ? items.length : idx;
}
