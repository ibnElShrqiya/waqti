import { describe, expect, it } from 'vitest';
import {
  buildHabitHeatmap,
  computeHabitCompletionRate,
  computeHabitStreaks,
  isHabitScheduledOn,
} from '../habits';
import type { Habit, HabitLog } from '../types';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test Habit',
    icon: 'leaf',
    color: '#176B56',
    category: 'health',
    frequencyType: 'daily',
    frequencyConfig: {},
    targetCount: 1,
    startDate: '2026-11-10',
    isArchived: false,
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
    ...overrides,
  };
}

describe('habits domain', () => {
  it('calculates streaks for weekday-scheduled habits without penalizing unscheduled days', () => {
    // Scheduled only on Sun (0), Tue (2), Thu (4)
    const habit = makeHabit({
      frequencyType: 'weekdays',
      frequencyConfig: { weekdays: [0, 2, 4] },
      startDate: '2026-11-15', // Sunday
    });

    expect(isHabitScheduledOn(habit, '2026-11-15')).toBe(true); // Sun
    expect(isHabitScheduledOn(habit, '2026-11-16')).toBe(false); // Mon
    expect(isHabitScheduledOn(habit, '2026-11-17')).toBe(true); // Tue

    const logs: HabitLog[] = [
      { id: '1', habitId: 'h1', logDate: '2026-11-15', completedCount: 1 },
      { id: '2', habitId: 'h1', logDate: '2026-11-17', completedCount: 1 },
    ];

    const streaks = computeHabitStreaks(habit, logs, '2026-11-18');
    expect(streaks).toEqual({ current: 2, longest: 2 });
  });

  it('requires full targetCount for partial-progress habits to count as completed', () => {
    const habit = makeHabit({ targetCount: 8, startDate: '2026-11-16' });
    const logs: HabitLog[] = [
      { id: '1', habitId: 'h1', logDate: '2026-11-16', completedCount: 8 },
      { id: '2', habitId: 'h1', logDate: '2026-11-17', completedCount: 5 }, // partial
      { id: '3', habitId: 'h1', logDate: '2026-11-18', completedCount: 8 },
    ];

    const streaks = computeHabitStreaks(habit, logs, '2026-11-18');
    expect(streaks).toEqual({ current: 1, longest: 1 });
    expect(computeHabitCompletionRate(habit, logs, 3, '2026-11-18')).toBeCloseTo(2 / 3);
  });

  it('calculates weekly_target streaks and heatmap cells', () => {
    const habit = makeHabit({
      frequencyType: 'weekly_target',
      frequencyConfig: { targetDays: 2 },
      startDate: '2026-11-08', // Sunday of previous week
    });
    const logs: HabitLog[] = [
      { id: '1', habitId: 'h1', logDate: '2026-11-09', completedCount: 1 },
      { id: '2', habitId: 'h1', logDate: '2026-11-11', completedCount: 1 },
      { id: '3', habitId: 'h1', logDate: '2026-11-16', completedCount: 1 },
      { id: '4', habitId: 'h1', logDate: '2026-11-18', completedCount: 1 },
    ];

    const streaks = computeHabitStreaks(habit, logs, '2026-11-18');
    expect(streaks).toEqual({ current: 2, longest: 2 });

    const cells = buildHabitHeatmap([habit], logs, 7, '2026-11-18');
    expect(cells).toHaveLength(7);
    expect(cells[6]?.completedCount).toBe(1);
  });
});
