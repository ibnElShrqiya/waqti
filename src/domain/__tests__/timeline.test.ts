import { describe, expect, it } from 'vitest';
import { buildTimeline, findNowIndex } from '../timeline';
import type { ScheduleEntry, Task } from '../types';

describe('buildTimeline', () => {
  const day = new Date(2026, 10, 18, 0, 0, 0);
  const at = (h: number) => new Date(2026, 10, 18, h, 0, 0).toISOString();

  const tasks: Task[] = [
    {
      id: 't1',
      title: 'Write docs',
      status: 'todo',
      priority: 'high',
      tags: [],
      startAt: at(10),
      endAt: at(11),
      createdAt: at(8),
      updatedAt: at(8),
    },
    {
      id: 't2',
      title: 'Deferred task',
      status: 'deferred',
      priority: 'low',
      tags: [],
      startAt: at(9),
      createdAt: at(8),
      updatedAt: at(8),
    },
  ];

  const entries: ScheduleEntry[] = [
    { id: 'p1', kind: 'prayer', title: 'Fajr', startAt: at(5), spiritual: true },
    { id: 'e1', kind: 'event', title: 'Standup', startAt: at(9) },
  ];

  it('merges scheduled tasks and entries chronologically and filters spiritual entries when disabled', () => {
    const withSpiritual = buildTimeline(tasks, entries, day, { includeSpiritual: true });
    expect(withSpiritual.map((i) => i.title)).toEqual(['Fajr', 'Standup', 'Write docs']);

    const withoutSpiritual = buildTimeline(tasks, entries, day, { includeSpiritual: false });
    expect(withoutSpiritual.map((i) => i.title)).toEqual(['Standup', 'Write docs']);
  });

  it('finds the first item that has not ended yet', () => {
    const items = buildTimeline(tasks, entries, day, { includeSpiritual: true });
    expect(findNowIndex(items, new Date(2026, 10, 18, 9, 30))).toBe(2);
    expect(findNowIndex(items, new Date(2026, 10, 18, 12, 0))).toBe(3);
  });
});
