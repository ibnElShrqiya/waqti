import { describe, expect, it } from 'vitest';
import {
  computeNextRecurrenceDates,
  computeTaskStats,
  filterTasks,
  isOverdue,
  selectUpcomingTasks,
  sortTasks,
} from '../tasks';
import type { Task } from '../types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'Sample',
    status: 'todo',
    priority: 'medium',
    tags: [],
    createdAt: '2026-11-18T08:00:00.000Z',
    updatedAt: '2026-11-18T08:00:00.000Z',
    ...overrides,
  };
}

describe('computeTaskStats', () => {
  const today = new Date(2026, 10, 18, 12, 0, 0);
  const todayIso = (h: number) => new Date(2026, 10, 18, h, 0, 0).toISOString();
  const tomorrowIso = new Date(2026, 10, 19, 10, 0, 0).toISOString();

  it('computes totals, completion rate, and important pending count for the day', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'completed', priority: 'high', startAt: todayIso(9) }),
      makeTask({ id: '2', status: 'todo', priority: 'urgent', dueAt: todayIso(18) }),
      makeTask({ id: '3', status: 'in_progress', priority: 'low', startAt: todayIso(15) }),
      makeTask({ id: '4', status: 'deferred', priority: 'urgent', startAt: todayIso(16) }),
      makeTask({ id: '5', status: 'todo', priority: 'urgent', dueAt: tomorrowIso }),
    ];

    const stats = computeTaskStats(tasks, today);
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.pending).toBe(2);
    expect(stats.pendingImportant).toBe(1);
    expect(stats.completionRate).toBeCloseTo(1 / 3);
  });

  it('returns zero completionRate when no tasks are planned', () => {
    const stats = computeTaskStats([], today);
    expect(stats).toEqual({
      total: 0,
      completed: 0,
      pending: 0,
      pendingImportant: 0,
      completionRate: 0,
    });
  });
});

describe('selectUpcomingTasks', () => {
  const now = new Date(2026, 10, 18, 12, 0, 0);

  it('excludes completed and deferred tasks and sorts by date then priority', () => {
    const tasks: Task[] = [
      makeTask({ id: 'done', status: 'completed', dueAt: new Date(2026, 10, 18, 13).toISOString() }),
      makeTask({ id: 'def', status: 'deferred', dueAt: new Date(2026, 10, 18, 13).toISOString() }),
      makeTask({ id: 'later', priority: 'urgent', dueAt: new Date(2026, 10, 19, 9).toISOString() }),
      makeTask({ id: 'soon-low', priority: 'low', dueAt: new Date(2026, 10, 18, 18).toISOString() }),
      makeTask({ id: 'soon-high', priority: 'high', dueAt: new Date(2026, 10, 18, 18).toISOString() }),
    ];

    const result = selectUpcomingTasks(tasks, now, 7, 5);
    expect(result.map((t) => t.id)).toEqual(['soon-high', 'soon-low', 'later']);
  });
});

describe('isOverdue', () => {
  const now = new Date(2026, 10, 18, 12, 0, 0);

  it('marks incomplete tasks past dueAt as overdue', () => {
    expect(isOverdue(makeTask({ dueAt: new Date(2026, 10, 18, 11).toISOString() }), now)).toBe(true);
    expect(isOverdue(makeTask({ status: 'completed', dueAt: new Date(2026, 10, 18, 11).toISOString() }), now)).toBe(false);
    expect(isOverdue(makeTask({ dueAt: new Date(2026, 10, 18, 14).toISOString() }), now)).toBe(false);
  });
});

describe('filterTasks & sortTasks', () => {
  const tasks: Task[] = [
    makeTask({
      id: '1',
      title: 'Beta report',
      priority: 'low',
      status: 'todo',
      categoryId: 'work',
      tags: ['finance'],
      dueAt: '2026-11-20T10:00:00.000Z',
    }),
    makeTask({
      id: '2',
      title: 'Alpha spec',
      priority: 'urgent',
      status: 'in_progress',
      categoryId: 'work',
      tags: ['api'],
      recurrence: { frequency: 'weekly', interval: 1 },
      dueAt: '2026-11-19T10:00:00.000Z',
    }),
    makeTask({
      id: '3',
      title: 'Done item',
      priority: 'high',
      status: 'completed',
      categoryId: 'personal',
      tags: [],
      dueAt: '2026-11-18T10:00:00.000Z',
    }),
  ];

  it('filters by search, status, priority, category, and recurringOnly', () => {
    expect(filterTasks(tasks, { search: 'spec' }).map((t) => t.id)).toEqual(['2']);
    expect(filterTasks(tasks, { status: 'active' }).map((t) => t.id)).toEqual(['1', '2']);
    expect(filterTasks(tasks, { priority: 'urgent' }).map((t) => t.id)).toEqual(['2']);
    expect(filterTasks(tasks, { categoryId: 'work', recurringOnly: true }).map((t) => t.id)).toEqual(['2']);
  });

  it('sorts by priority and title while keeping completed items below active ones for priority/dueAt', () => {
    expect(sortTasks(tasks, 'priority', 'asc').map((t) => t.id)).toEqual(['2', '1', '3']);
    expect(sortTasks(tasks, 'title', 'asc').map((t) => t.id)).toEqual(['2', '1', '3']);
  });
});

describe('computeNextRecurrenceDates', () => {
  it('advances daily, weekly, and monthly dates and respects endDate', () => {
    const base = {
      startAt: '2026-11-18T09:00:00.000Z',
      endAt: '2026-11-18T10:00:00.000Z',
      dueAt: '2026-11-18T12:00:00.000Z',
    };

    const daily = computeNextRecurrenceDates({ ...base, recurrence: { frequency: 'daily', interval: 2 } });
    expect(daily?.dueAt?.startsWith('2026-11-20')).toBe(true);

    const weekly = computeNextRecurrenceDates({ ...base, recurrence: { frequency: 'weekly', interval: 1 } });
    expect(weekly?.dueAt?.startsWith('2026-11-25')).toBe(true);

    const pastEnd = computeNextRecurrenceDates({
      ...base,
      recurrence: { frequency: 'daily', interval: 1, endDate: '2026-11-18' },
    });
    expect(pastEnd).toBeNull();
  });
});
