import { describe, expect, it } from 'vitest';
import {
  buildCalendarItems,
  findEventConflicts,
  formatTimeInZone,
  getMonthGridDays,
  getWeekDays,
  localDateTimeToIso,
} from '../calendar';
import type { CalendarEvent, Task } from '../types';

describe('calendar domain', () => {
  const events: CalendarEvent[] = [
    {
      id: 'ev1',
      title: 'Team sync',
      startAt: '2026-11-18T10:00:00.000Z',
      endAt: '2026-11-18T11:00:00.000Z',
      allDay: false,
      timezone: 'UTC',
      color: '#2D699B',
      taskId: 't1',
      createdAt: '2026-11-18T08:00:00.000Z',
      updatedAt: '2026-11-18T08:00:00.000Z',
    },
  ];

  const tasks: Task[] = [
    {
      id: 't1',
      title: 'Linked task',
      status: 'todo',
      priority: 'high',
      tags: [],
      startAt: '2026-11-18T10:00:00.000Z',
      endAt: '2026-11-18T11:00:00.000Z',
      createdAt: '2026-11-18T08:00:00.000Z',
      updatedAt: '2026-11-18T08:00:00.000Z',
    },
    {
      id: 't2',
      title: 'Standalone task',
      status: 'todo',
      priority: 'medium',
      tags: [],
      startAt: '2026-11-18T14:00:00.000Z',
      estimatedMinutes: 45,
      createdAt: '2026-11-18T08:00:00.000Z',
      updatedAt: '2026-11-18T08:00:00.000Z',
    },
  ];

  it('deduplicates tasks already linked to a calendar event', () => {
    const items = buildCalendarItems(events, tasks);
    expect(items.map((i) => i.title)).toEqual(['Team sync', 'Standalone task']);
  });

  it('detects overlapping timed events and ignores self or non-overlapping ranges', () => {
    const items = buildCalendarItems(events, tasks);

    const overlap = findEventConflicts(
      {
        start: new Date('2026-11-18T10:30:00.000Z'),
        end: new Date('2026-11-18T11:30:00.000Z'),
      },
      items,
    );
    expect(overlap.map((i) => i.title)).toEqual(['Team sync']);

    const selfCheck = findEventConflicts(
      {
        id: 'ev1',
        start: new Date('2026-11-18T10:30:00.000Z'),
        end: new Date('2026-11-18T11:30:00.000Z'),
      },
      items,
    );
    expect(selfCheck).toHaveLength(0);
  });

  it('builds 7-day week and 42-day month grids and converts/formats timezones', () => {
    const anchor = new Date(2026, 10, 18); // Wednesday
    expect(getWeekDays(anchor)).toHaveLength(7);
    expect(getMonthGridDays(anchor)).toHaveLength(42);

    const iso = localDateTimeToIso('2026-11-18', '09:30');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(formatTimeInZone('2026-11-18T10:00:00.000Z', 'UTC', 'en-US')).toContain('10:00');
  });
});
