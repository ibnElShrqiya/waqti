import { addDays, isSameDay, startOfDay } from '@/lib/date';
import type { Priority, RecurrenceRule, Task, TaskStatus } from './types';

export const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
export const STATUS_RANK: Record<TaskStatus, number> = {
  in_progress: 0,
  todo: 1,
  deferred: 2,
  completed: 3,
};

/** The date a task "belongs" to: its scheduled start, else its deadline. */
export function taskAnchorDate(task: Task): Date | undefined {
  const iso = task.startAt ?? task.dueAt;
  return iso ? new Date(iso) : undefined;
}

export function isTaskForDay(task: Task, day: Date): boolean {
  const anchor = taskAnchorDate(task);
  return anchor ? isSameDay(anchor, day) : false;
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  /** Pending tasks with urgent/high priority. */
  pendingImportant: number;
  /** Ratio in [0, 1]. 0 when there are no tasks. */
  completionRate: number;
}

/** Statistics for a day's plan. Deferred tasks are excluded from the plan. */
export function computeTaskStats(tasks: Task[], day: Date): TaskStats {
  const planned = tasks.filter((t) => t.status !== 'deferred' && isTaskForDay(t, day));
  const completed = planned.filter((t) => t.status === 'completed').length;
  const pendingTasks = planned.filter((t) => t.status !== 'completed');
  const pendingImportant = pendingTasks.filter(
    (t) => t.priority === 'urgent' || t.priority === 'high',
  ).length;
  return {
    total: planned.length,
    completed,
    pending: pendingTasks.length,
    pendingImportant,
    completionRate: planned.length === 0 ? 0 : completed / planned.length,
  };
}

/**
 * Open tasks that still need attention, soonest first: today's remaining
 * tasks (including overdue ones) and tasks within the next `days` days.
 */
export function selectUpcomingTasks(tasks: Task[], now: Date, days = 7, limit = 5): Task[] {
  const horizon = addDays(startOfDay(now), days + 1).getTime();
  return tasks
    .filter((t) => t.status !== 'completed' && t.status !== 'deferred')
    .filter((t) => {
      const anchor = taskAnchorDate(t);
      return anchor !== undefined && anchor.getTime() < horizon;
    })
    .sort((a, b) => {
      const da = taskAnchorDate(a)!.getTime();
      const db = taskAnchorDate(b)!.getTime();
      return da - db || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    })
    .slice(0, limit);
}

export function isOverdue(task: Task, now: Date): boolean {
  if (task.status === 'completed' || !task.dueAt) return false;
  return new Date(task.dueAt).getTime() < now.getTime();
}

export interface TaskFilterOptions {
  search?: string;
  status?: TaskStatus | 'all' | 'active';
  priority?: Priority | 'all';
  categoryId?: string | 'all';
  tag?: string | 'all';
  recurringOnly?: boolean;
}

export type TaskSortField = 'dueAt' | 'priority' | 'createdAt' | 'title';
export type TaskSortDirection = 'asc' | 'desc';

export function filterTasks(tasks: Task[], filter: TaskFilterOptions): Task[] {
  const q = filter.search?.trim().toLowerCase() ?? '';
  return tasks.filter((t) => {
    if (filter.status === 'active' && (t.status === 'completed' || t.status === 'deferred')) return false;
    if (filter.status && filter.status !== 'all' && filter.status !== 'active' && t.status !== filter.status) {
      return false;
    }
    if (filter.priority && filter.priority !== 'all' && t.priority !== filter.priority) return false;
    if (filter.categoryId && filter.categoryId !== 'all' && t.categoryId !== filter.categoryId) return false;
    if (filter.tag && filter.tag !== 'all' && !t.tags.includes(filter.tag)) return false;
    if (filter.recurringOnly && !t.recurrence) return false;
    if (q) {
      const hay = `${t.title} ${t.notes ?? ''} ${t.tags.join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortTasks(tasks: Task[], field: TaskSortField, direction: TaskSortDirection = 'asc'): Task[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...tasks].sort((a, b) => {
    // Keep completed tasks grouped below active tasks when sorting by due date or priority
    if (field === 'dueAt' || field === 'priority') {
      const aDone = a.status === 'completed' ? 1 : 0;
      const bDone = b.status === 'completed' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
    }

    if (field === 'priority') {
      const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (diff !== 0) return diff * factor;
    } else if (field === 'dueAt') {
      const da = taskAnchorDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const db = taskAnchorDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (da !== db) return (da - db) * factor;
    } else if (field === 'title') {
      const cmp = a.title.localeCompare(b.title);
      if (cmp !== 0) return cmp * factor;
    } else if (field === 'createdAt') {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (diff !== 0) return diff * factor;
    }

    return STATUS_RANK[a.status] - STATUS_RANK[b.status] || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  });
}

function advanceDateByRecurrence(iso: string, rule: RecurrenceRule): string {
  const d = new Date(iso);
  const step = Math.max(1, rule.interval);
  if (rule.frequency === 'daily') {
    d.setDate(d.getDate() + step);
  } else if (rule.frequency === 'weekly') {
    d.setDate(d.getDate() + step * 7);
  } else {
    d.setMonth(d.getMonth() + step);
  }
  return d.toISOString();
}

/**
 * Computes the next occurrence's dates when a recurring task is completed.
 * Returns null if the next occurrence would fall after `recurrence.endDate`.
 */
export function computeNextRecurrenceDates(
  task: Pick<Task, 'startAt' | 'endAt' | 'dueAt' | 'recurrence'>,
  now = new Date(),
): { startAt?: string; endAt?: string; dueAt?: string } | null {
  if (!task.recurrence) return null;
  const rule = task.recurrence;

  const baseAnchor = task.dueAt ?? task.startAt ?? now.toISOString();
  const nextAnchor = advanceDateByRecurrence(baseAnchor, rule);
  if (rule.endDate && new Date(nextAnchor).getTime() > new Date(`${rule.endDate}T23:59:59.999Z`).getTime()) {
    return null;
  }

  return {
    startAt: task.startAt ? advanceDateByRecurrence(task.startAt, rule) : undefined,
    endAt: task.endAt ? advanceDateByRecurrence(task.endAt, rule) : undefined,
    dueAt: task.dueAt ? advanceDateByRecurrence(task.dueAt, rule) : nextAnchor,
  };
}
