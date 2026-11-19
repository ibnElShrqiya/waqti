import { describe, expect, it } from 'vitest';
import { computeDateRange, computeProductivityReport, exportReportToCsv } from '../analytics';
import type { CalendarEvent, FocusSession, Goal, Habit, HabitLog, Task } from '../types';

describe('analytics domain', () => {
  const anchor = new Date(2026, 10, 18, 12, 0, 0);

  it('computes daily, weekly, monthly, yearly, and custom date ranges', () => {
    expect(computeDateRange('daily', anchor)).toEqual({
      startKey: '2026-11-18',
      endKey: '2026-11-18',
    });
    expect(computeDateRange('weekly', anchor)).toEqual({
      startKey: '2026-11-12',
      endKey: '2026-11-18',
    });
    expect(computeDateRange('monthly', anchor)).toEqual({
      startKey: '2026-11-01',
      endKey: '2026-11-30',
    });
    expect(computeDateRange('yearly', anchor)).toEqual({
      startKey: '2026-01-01',
      endKey: '2026-12-31',
    });
    expect(computeDateRange('custom', anchor, '2026-11-10', '2026-11-05')).toEqual({
      startKey: '2026-11-05',
      endKey: '2026-11-10',
    });
  });

  it('aggregates tasks, focus, habits, goals, and exports UTF-8 BOM CSV', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Task A',
        status: 'completed',
        priority: 'high',
        tags: [],
        estimatedMinutes: 30,
        completedAt: '2026-11-18T10:00:00.000Z',
        createdAt: '2026-11-18T08:00:00.000Z',
        updatedAt: '2026-11-18T10:00:00.000Z',
      },
      {
        id: 't2',
        title: 'Task B',
        status: 'todo',
        priority: 'urgent',
        tags: [],
        estimatedMinutes: 45,
        dueAt: '2026-11-18T16:00:00.000Z',
        createdAt: '2026-11-18T08:00:00.000Z',
        updatedAt: '2026-11-18T08:00:00.000Z',
      },
    ];
    const focusSessions: FocusSession[] = [
      {
        id: 'f1',
        startedAt: '2026-11-18T09:00:00.000Z',
        durationSeconds: 1500,
        sessionType: 'focus',
        status: 'completed',
        distractionCount: 0,
        createdAt: '2026-11-18T09:00:00.000Z',
      },
    ];
    const habits: Habit[] = [
      {
        id: 'h1',
        name: 'Walk',
        icon: 'run',
        color: '#176B56',
        category: 'health',
        frequencyType: 'daily',
        frequencyConfig: {},
        targetCount: 1,
        startDate: '2026-11-18',
        isArchived: false,
        createdAt: '2026-11-18T00:00:00.000Z',
        updatedAt: '2026-11-18T00:00:00.000Z',
      },
    ];
    const habitLogs: HabitLog[] = [
      { id: 'hl1', habitId: 'h1', logDate: '2026-11-18', completedCount: 1 },
    ];
    const goals: Goal[] = [
      {
        id: 'g1',
        title: 'Goal',
        category: 'personal',
        icon: 'flag',
        color: '#176B56',
        startDate: '2026-11-01',
        priority: 'medium',
        status: 'active',
        manualProgress: 50,
        currentValue: 0,
        milestones: [],
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
      },
    ];
    const events: CalendarEvent[] = [
      {
        id: 'e1',
        title: 'Sync',
        startAt: '2026-11-18T11:00:00.000Z',
        endAt: '2026-11-18T12:00:00.000Z',
        allDay: false,
        timezone: 'UTC',
        color: '#2D699B',
        createdAt: '2026-11-18T08:00:00.000Z',
        updatedAt: '2026-11-18T08:00:00.000Z',
      },
    ];

    const range = computeDateRange('daily', anchor);
    const report = computeProductivityReport(
      { tasks, focusSessions, habits, habitLogs, goals, events },
      range,
    );

    expect(report.tasks.total).toBe(2);
    expect(report.tasks.completed).toBe(1);
    expect(report.tasks.completionRate).toBeCloseTo(0.5);
    expect(report.focus.totalMinutes).toBe(25);
    expect(report.habits.consistencyRate).toBe(1);
    expect(report.goals.averageProgress).toBeCloseTo(0.5);
    expect(report.timeDistribution.eventMinutes).toBe(60);

    const csv = exportReportToCsv(report);
    expect(csv.startsWith('\uFEFFSection,Metric,Value')).toBe(true);
    expect(csv).toContain('Focus,Total Minutes,25');
  });
});
