import { computeGoalProgress } from './goals';
import { isHabitCompletedOn, isHabitScheduledOn } from './habits';
import type { CalendarEvent, FocusSession, Goal, Habit, HabitLog, Priority, Task } from './types';
import { addDays, fromDayKey, startOfDay, toDayKey } from '@/lib/date';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface DateRange {
  startKey: string; // YYYY-MM-DD
  endKey: string;   // YYYY-MM-DD
}

export function computeDateRange(
  period: ReportPeriod,
  anchor: Date,
  customStart?: string,
  customEnd?: string,
): DateRange {
  if (period === 'custom' && customStart && customEnd) {
    return customStart <= customEnd
      ? { startKey: customStart, endKey: customEnd }
      : { startKey: customEnd, endKey: customStart };
  }

  const d = startOfDay(anchor);
  if (period === 'daily') {
    const key = toDayKey(d);
    return { startKey: key, endKey: key };
  }
  if (period === 'weekly') {
    const endKey = toDayKey(d);
    const startKey = toDayKey(addDays(d, -6));
    return { startKey, endKey };
  }
  if (period === 'monthly') {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { startKey: toDayKey(start), endKey: toDayKey(end) };
  }
  // yearly
  const start = new Date(d.getFullYear(), 0, 1);
  const end = new Date(d.getFullYear(), 11, 31);
  return { startKey: toDayKey(start), endKey: toDayKey(end) };
}

export interface DailyTrendPoint {
  dateKey: string;
  tasksCompleted: number;
  focusMinutes: number;
  habitsCompleted: number;
}

export interface ProductivityReport {
  range: DateRange;
  tasks: {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
    byPriority: Record<Priority, number>;
  };
  focus: {
    totalMinutes: number;
    sessionsCount: number;
    averageMinutes: number;
  };
  habits: {
    scheduledTotal: number;
    completedTotal: number;
    consistencyRate: number;
  };
  goals: {
    activeCount: number;
    completedCount: number;
    averageProgress: number;
  };
  timeDistribution: {
    focusMinutes: number;
    scheduledTaskMinutes: number;
    eventMinutes: number;
  };
  trend: DailyTrendPoint[];
}

function enumerateDays(startKey: string, endKey: string, maxDays = 366): string[] {
  const result: string[] = [];
  let cursor = fromDayKey(startKey);
  const end = fromDayKey(endKey);
  while (cursor.getTime() <= end.getTime() && result.length < maxDays) {
    result.push(toDayKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return result;
}

export function computeProductivityReport(
  input: {
    tasks: Task[];
    focusSessions: FocusSession[];
    habits: Habit[];
    habitLogs: HabitLog[];
    goals: Goal[];
    events: CalendarEvent[];
  },
  range: DateRange,
): ProductivityReport {
  const { startKey, endKey } = range;
  const inRange = (iso?: string) => {
    if (!iso) return false;
    const key = toDayKey(new Date(iso));
    return key >= startKey && key <= endKey;
  };

  // Tasks in range (by completedAt, startAt, dueAt, or createdAt)
  const rangedTasks = input.tasks.filter(
    (t) => inRange(t.completedAt) || inRange(t.startAt) || inRange(t.dueAt) || inRange(t.createdAt),
  );
  const completedTasks = rangedTasks.filter((t) => t.status === 'completed');
  const byPriority: Record<Priority, number> = { urgent: 0, high: 0, medium: 0, low: 0 };
  for (const t of rangedTasks) byPriority[t.priority] += 1;

  // Focus sessions
  const focusSessions = input.focusSessions.filter(
    (s) => s.sessionType === 'focus' && s.status === 'completed' && inRange(s.startedAt),
  );
  const focusTotalSec = focusSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const focusMinutes = Math.round(focusTotalSec / 60);

  // Habits consistency across range
  const activeHabits = input.habits.filter((h) => !h.isArchived);
  const days = enumerateDays(startKey, endKey);
  let scheduledTotal = 0;
  let completedTotal = 0;
  const habitLogsByHabit = new Map<string, Map<string, HabitLog>>();
  for (const h of activeHabits) {
    habitLogsByHabit.set(
      h.id,
      new Map(input.habitLogs.filter((l) => l.habitId === h.id).map((l) => [l.logDate, l])),
    );
  }

  for (const dayKey of days) {
    for (const h of activeHabits) {
      if (!isHabitScheduledOn(h, dayKey)) continue;
      scheduledTotal += 1;
      const map = habitLogsByHabit.get(h.id)!;
      if (isHabitCompletedOn(h, map, dayKey)) completedTotal += 1;
    }
  }

  // Goals
  const activeGoals = input.goals.filter((g) => g.status === 'active');
  const completedGoals = input.goals.filter((g) => g.status === 'completed');
  const avgGoalProgress =
    input.goals.length === 0
      ? 0
      : input.goals.reduce((acc, g) => acc + computeGoalProgress(g), 0) / input.goals.length;

  // Time distribution
  const scheduledTaskMinutes = rangedTasks.reduce((acc, t) => {
    if (t.startAt && t.endAt) {
      return acc + Math.max(0, Math.round((new Date(t.endAt).getTime() - new Date(t.startAt).getTime()) / 60_000));
    }
    return acc + (t.estimatedMinutes ?? 0);
  }, 0);

  const eventMinutes = input.events
    .filter((e) => !e.allDay && inRange(e.startAt))
    .reduce((acc, e) => acc + Math.max(0, Math.round((new Date(e.endAt).getTime() - new Date(e.startAt).getTime()) / 60_000)), 0);

  // Daily trend (last 14 days of range if range is very wide, or all days if <= 31)
  const trendDays = days.length > 31 ? days.slice(-14) : days;
  const trend: DailyTrendPoint[] = trendDays.map((dayKey) => {
    const tasksCompleted = completedTasks.filter(
      (t) => t.completedAt && toDayKey(new Date(t.completedAt)) === dayKey,
    ).length;
    const dayFocusMin = Math.round(
      focusSessions
        .filter((s) => toDayKey(new Date(s.startedAt)) === dayKey)
        .reduce((acc, s) => acc + s.durationSeconds, 0) / 60,
    );
    let habitsCompleted = 0;
    for (const h of activeHabits) {
      const map = habitLogsByHabit.get(h.id)!;
      if (isHabitCompletedOn(h, map, dayKey)) habitsCompleted += 1;
    }
    return { dateKey: dayKey, tasksCompleted, focusMinutes: dayFocusMin, habitsCompleted };
  });

  return {
    range,
    tasks: {
      total: rangedTasks.length,
      completed: completedTasks.length,
      pending: rangedTasks.length - completedTasks.length,
      completionRate: rangedTasks.length === 0 ? 0 : completedTasks.length / rangedTasks.length,
      byPriority,
    },
    focus: {
      totalMinutes: focusMinutes,
      sessionsCount: focusSessions.length,
      averageMinutes: focusSessions.length === 0 ? 0 : Math.round(focusMinutes / focusSessions.length),
    },
    habits: {
      scheduledTotal,
      completedTotal,
      consistencyRate: scheduledTotal === 0 ? 0 : completedTotal / scheduledTotal,
    },
    goals: {
      activeCount: activeGoals.length,
      completedCount: completedGoals.length,
      averageProgress: avgGoalProgress,
    },
    timeDistribution: {
      focusMinutes,
      scheduledTaskMinutes,
      eventMinutes,
    },
    trend,
  };
}

function csvCell(value: string | number): string {
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Generates UTF-8 BOM CSV for Excel compatibility (Arabic + English). */
export function exportReportToCsv(report: ProductivityReport): string {
  const rows: (string | number)[][] = [
    ['Section', 'Metric', 'Value'],
    ['Range', 'Start Date', report.range.startKey],
    ['Range', 'End Date', report.range.endKey],
    ['Tasks', 'Total', report.tasks.total],
    ['Tasks', 'Completed', report.tasks.completed],
    ['Tasks', 'Completion Rate (%)', Math.round(report.tasks.completionRate * 100)],
    ['Focus', 'Total Minutes', report.focus.totalMinutes],
    ['Focus', 'Completed Sessions', report.focus.sessionsCount],
    ['Focus', 'Average Session (min)', report.focus.averageMinutes],
    ['Habits', 'Scheduled', report.habits.scheduledTotal],
    ['Habits', 'Completed', report.habits.completedTotal],
    ['Habits', 'Consistency (%)', Math.round(report.habits.consistencyRate * 100)],
    ['Goals', 'Active', report.goals.activeCount],
    ['Goals', 'Completed', report.goals.completedCount],
    ['Goals', 'Average Progress (%)', Math.round(report.goals.averageProgress * 100)],
    [],
    ['Date', 'Tasks Completed', 'Focus Minutes', 'Habits Completed'],
    ...report.trend.map((pt) => [pt.dateKey, pt.tasksCompleted, pt.focusMinutes, pt.habitsCompleted]),
  ];

  return '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}
