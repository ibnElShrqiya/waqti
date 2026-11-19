import { addDays, fromDayKey, toDayKey } from '@/lib/date';
import type { Habit, HabitLog } from './types';

/**
 * Returns whether a habit is scheduled on a given YYYY-MM-DD dayKey.
 * Weekly/monthly targets are flexible across any day within their active date range.
 */
export function isHabitScheduledOn(habit: Habit, dayKey: string): boolean {
  if (dayKey < habit.startDate) return false;
  if (habit.endDate && dayKey > habit.endDate) return false;

  if (habit.frequencyType === 'weekdays') {
    const allowed = habit.frequencyConfig.weekdays ?? [];
    if (allowed.length === 0) return true;
    const dow = fromDayKey(dayKey).getDay();
    return allowed.includes(dow);
  }
  return true;
}

export function isHabitCompletedOn(habit: Habit, logsByDate: Map<string, HabitLog>, dayKey: string): boolean {
  const log = logsByDate.get(dayKey);
  return Boolean(log && log.completedCount >= habit.targetCount);
}

export interface HabitStreakResult {
  current: number;
  longest: number;
}

function getWeekKey(dayKey: string): string {
  const d = fromDayKey(dayKey);
  const sunday = addDays(d, -d.getDay());
  return toDayKey(sunday);
}

function getMonthKey(dayKey: string): string {
  return dayKey.slice(0, 7);
}

/**
 * Computes current & longest streaks according to the habit's configured schedule:
 * - `daily` & `weekdays`: non-scheduled days are skipped (never treated as missed).
 * - `weekly_target`: counts consecutive weeks meeting `frequencyConfig.targetDays`.
 * - `monthly_target`: counts consecutive months meeting `frequencyConfig.targetDays`.
 */
export function computeHabitStreaks(
  habit: Habit,
  logs: HabitLog[],
  todayKey: string,
): HabitStreakResult {
  const habitLogs = logs.filter((l) => l.habitId === habit.id);
  const logsByDate = new Map(habitLogs.map((l) => [l.logDate, l]));

  if (habit.frequencyType === 'weekly_target' || habit.frequencyType === 'monthly_target') {
    const targetDays = Math.max(1, habit.frequencyConfig.targetDays ?? 1);
    const keyFn = habit.frequencyType === 'weekly_target' ? getWeekKey : getMonthKey;
    const counts = new Map<string, number>();

    for (const log of habitLogs) {
      if (log.completedCount >= habit.targetCount) {
        const pKey = keyFn(log.logDate);
        counts.set(pKey, (counts.get(pKey) ?? 0) + 1);
      }
    }

    // Build ordered list of periods from startDate to todayKey
    const periods: string[] = [];
    let cursor = fromDayKey(habit.startDate);
    const end = fromDayKey(todayKey);
    const seen = new Set<string>();
    while (cursor.getTime() <= end.getTime()) {
      const pKey = keyFn(toDayKey(cursor));
      if (!seen.has(pKey)) {
        seen.add(pKey);
        periods.push(pKey);
      }
      cursor = addDays(cursor, 1);
    }

    let longest = 0;
    let running = 0;
    for (const p of periods) {
      if ((counts.get(p) ?? 0) >= targetDays) {
        running += 1;
        if (running > longest) longest = running;
      } else {
        running = 0;
      }
    }

    // Current streak: count backwards; allow current period to be in-progress
    let current = 0;
    const lastIdx = periods.length - 1;
    for (let i = lastIdx; i >= 0; i--) {
      const p = periods[i]!;
      const met = (counts.get(p) ?? 0) >= targetDays;
      if (met) {
        current += 1;
      } else if (i === lastIdx) {
        // Current week/month still in progress — check previous period
        continue;
      } else {
        break;
      }
    }

    return { current, longest };
  }

  // Daily or specific weekdays
  const start = fromDayKey(habit.startDate);
  const today = fromDayKey(todayKey);
  if (today.getTime() < start.getTime()) return { current: 0, longest: 0 };

  let longest = 0;
  let running = 0;
  let cursor = new Date(start);

  while (cursor.getTime() <= today.getTime()) {
    const key = toDayKey(cursor);
    if (isHabitScheduledOn(habit, key)) {
      if (isHabitCompletedOn(habit, logsByDate, key)) {
        running += 1;
        if (running > longest) longest = running;
      } else {
        running = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }

  // Current streak backwards from today (if today is scheduled and not yet done, streak from yesterday still holds)
  let current = 0;
  cursor = new Date(today);
  let checkedToday = false;
  while (cursor.getTime() >= start.getTime()) {
    const key = toDayKey(cursor);
    if (isHabitScheduledOn(habit, key)) {
      if (isHabitCompletedOn(habit, logsByDate, key)) {
        current += 1;
      } else if (!checkedToday && key === todayKey) {
        // Today isn't over yet
      } else {
        break;
      }
      checkedToday = true;
    }
    cursor = addDays(cursor, -1);
  }

  return { current, longest };
}

/** Completion percentage (0..1) over the last `windowDays` scheduled days up to `todayKey`. */
export function computeHabitCompletionRate(
  habit: Habit,
  logs: HabitLog[],
  windowDays: number,
  todayKey: string,
): number {
  const logsByDate = new Map(
    logs.filter((l) => l.habitId === habit.id).map((l) => [l.logDate, l]),
  );
  const today = fromDayKey(todayKey);
  let scheduled = 0;
  let completed = 0;

  for (let i = 0; i < windowDays; i++) {
    const key = toDayKey(addDays(today, -i));
    if (key < habit.startDate) break;
    if (!isHabitScheduledOn(habit, key)) continue;
    scheduled += 1;
    if (isHabitCompletedOn(habit, logsByDate, key)) completed += 1;
  }

  return scheduled === 0 ? 0 : completed / scheduled;
}

export interface HeatmapCell {
  date: string;
  completedCount: number;
  scheduledCount: number;
  ratio: number;
}

export function buildHabitHeatmap(
  habits: Habit[],
  logs: HabitLog[],
  days: number,
  todayKey: string,
): HeatmapCell[] {
  const active = habits.filter((h) => !h.isArchived);
  const today = fromDayKey(todayKey);
  const logIndex = new Map<string, number>();
  for (const log of logs) {
    logIndex.set(`${log.habitId}:${log.logDate}`, log.completedCount);
  }

  const cells: HeatmapCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = toDayKey(addDays(today, -i));
    let scheduledCount = 0;
    let completedCount = 0;
    for (const h of active) {
      if (!isHabitScheduledOn(h, date)) continue;
      scheduledCount += 1;
      if ((logIndex.get(`${h.id}:${date}`) ?? 0) >= h.targetCount) {
        completedCount += 1;
      }
    }
    cells.push({
      date,
      completedCount,
      scheduledCount,
      ratio: scheduledCount === 0 ? 0 : completedCount / scheduledCount,
    });
  }
  return cells;
}
