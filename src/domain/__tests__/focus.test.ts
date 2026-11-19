import { describe, expect, it } from 'vitest';
import {
  computeFocusAnalytics,
  computeRemainingMs,
  createInitialTimerState,
  DEFAULT_FOCUS_PREFERENCES,
  getNextFocusPhase,
  pauseTimer,
  startOrResumeTimer,
} from '../focus';
import type { FocusSession } from '../types';

describe('focus timer & analytics', () => {
  it('computes remaining time from timestamps and recovers accurately across suspension', () => {
    const startMs = 1_700_000_000_000;
    const initial = createInitialTimerState(DEFAULT_FOCUS_PREFERENCES);
    expect(computeRemainingMs(initial, startMs)).toBe(25 * 60_000);

    const running = startOrResumeTimer(initial, startMs);
    // Simulate 10 minutes of browser suspension / tab sleep
    const afterSleepMs = startMs + 10 * 60_000;
    expect(computeRemainingMs(running, afterSleepMs)).toBe(15 * 60_000);

    const paused = pauseTimer(running, afterSleepMs);
    // Advancing clock while paused does not drain remaining time
    expect(computeRemainingMs(paused, afterSleepMs + 5 * 60_000)).toBe(15 * 60_000);

    const resumed = startOrResumeTimer(paused, afterSleepMs + 5 * 60_000);
    expect(computeRemainingMs(resumed, afterSleepMs + 20 * 60_000)).toBe(0);
  });

  it('transitions through short breaks and long break after N focus sessions', () => {
    const prefs = { ...DEFAULT_FOCUS_PREFERENCES, sessionsBeforeLongBreak: 4 };
    expect(getNextFocusPhase('focus', 0, prefs)).toEqual({ nextPhase: 'short_break', nextCycleCount: 1 });
    expect(getNextFocusPhase('short_break', 1, prefs)).toEqual({ nextPhase: 'focus', nextCycleCount: 1 });
    expect(getNextFocusPhase('focus', 3, prefs)).toEqual({ nextPhase: 'long_break', nextCycleCount: 4 });
  });

  it('computes focus analytics across today, week, and month', () => {
    const now = new Date(2026, 10, 18, 15, 0, 0);
    const sessions: FocusSession[] = [
      {
        id: '1',
        startedAt: new Date(2026, 10, 18, 9, 0).toISOString(),
        durationSeconds: 1500,
        sessionType: 'focus',
        status: 'completed',
        distractionCount: 0,
        createdAt: now.toISOString(),
      },
      {
        id: '2',
        startedAt: new Date(2026, 10, 16, 10, 0).toISOString(),
        durationSeconds: 3000,
        sessionType: 'focus',
        status: 'completed',
        distractionCount: 1,
        createdAt: now.toISOString(),
      },
      {
        id: '3',
        startedAt: new Date(2026, 10, 18, 10, 0).toISOString(),
        durationSeconds: 300,
        sessionType: 'short_break',
        status: 'completed',
        distractionCount: 0,
        createdAt: now.toISOString(),
      },
    ];

    const analytics = computeFocusAnalytics(sessions, now);
    expect(analytics.todayMinutes).toBe(25);
    expect(analytics.weekMinutes).toBe(75);
    expect(analytics.completedSessions).toBe(2);
    expect(analytics.averageMinutes).toBe(38);
    expect(analytics.mostProductiveDayKey).toBe('2026-11-16');
  });
});
