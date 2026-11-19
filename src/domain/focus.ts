import { addDays, toDayKey } from '@/lib/date';
import type {
  FocusPreferences,
  FocusSession,
  FocusSessionType,
  FocusSummary,
} from './types';

export const DEFAULT_FOCUS_PREFERENCES: FocusPreferences = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  ambientSound: 'none',
};

export interface FocusTimerState {
  phase: FocusSessionType;
  status: 'idle' | 'running' | 'paused';
  /** Total duration of the current phase in milliseconds. */
  durationMs: number;
  /** Epoch ms when the current run segment started. */
  startedAtMs: number | null;
  /** Epoch ms when the current run segment will finish (timestamp-based for suspension recovery). */
  targetEndMs: number | null;
  /** Remaining ms captured at pause time. */
  pausedRemainingMs: number;
  /** Number of completed focus sessions in the current cycle. */
  completedCycleCount: number;
  taskId?: string;
  distractions: number;
}

export function getPhaseDurationMinutes(phase: FocusSessionType, prefs: FocusPreferences): number {
  if (phase === 'focus') return prefs.focusDuration;
  if (phase === 'short_break') return prefs.shortBreakDuration;
  return prefs.longBreakDuration;
}

export function createInitialTimerState(prefs: FocusPreferences): FocusTimerState {
  const durationMs = prefs.focusDuration * 60_000;
  return {
    phase: 'focus',
    status: 'idle',
    durationMs,
    startedAtMs: null,
    targetEndMs: null,
    pausedRemainingMs: durationMs,
    completedCycleCount: 0,
    distractions: 0,
  };
}

/**
 * Timestamp-based remaining time calculation.
 * Recovers accurately across tab suspension, browser sleep, and page refreshes.
 */
export function computeRemainingMs(state: FocusTimerState, nowMs: number): number {
  if (state.status === 'running' && state.targetEndMs !== null) {
    return Math.max(0, state.targetEndMs - nowMs);
  }
  return Math.max(0, state.pausedRemainingMs);
}

export function startOrResumeTimer(state: FocusTimerState, nowMs: number): FocusTimerState {
  if (state.status === 'running') return state;
  const remaining = Math.max(1000, state.pausedRemainingMs || state.durationMs);
  return {
    ...state,
    status: 'running',
    startedAtMs: state.startedAtMs ?? nowMs,
    targetEndMs: nowMs + remaining,
  };
}

export function pauseTimer(state: FocusTimerState, nowMs: number): FocusTimerState {
  if (state.status !== 'running') return state;
  const remaining = computeRemainingMs(state, nowMs);
  return {
    ...state,
    status: 'paused',
    targetEndMs: null,
    pausedRemainingMs: remaining,
  };
}

export function getNextFocusPhase(
  currentPhase: FocusSessionType,
  completedCycleCount: number,
  prefs: FocusPreferences,
): { nextPhase: FocusSessionType; nextCycleCount: number } {
  if (currentPhase === 'focus') {
    const nextCount = completedCycleCount + 1;
    const isLong = nextCount % Math.max(1, prefs.sessionsBeforeLongBreak) === 0;
    return {
      nextPhase: isLong ? 'long_break' : 'short_break',
      nextCycleCount: nextCount,
    };
  }
  return {
    nextPhase: 'focus',
    nextCycleCount: completedCycleCount,
  };
}

export interface FocusAnalytics {
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  completedSessions: number;
  averageMinutes: number;
  mostProductiveDayKey: string | null;
}

export function computeFocusAnalytics(sessions: FocusSession[], now: Date): FocusAnalytics {
  const todayKey = toDayKey(now);
  const weekCutoff = toDayKey(addDays(now, -6));
  const monthCutoff = toDayKey(addDays(now, -29));

  const focusCompleted = sessions.filter(
    (s) => s.sessionType === 'focus' && s.status === 'completed',
  );

  let todaySec = 0;
  let weekSec = 0;
  let monthSec = 0;
  let totalSec = 0;
  const byDay = new Map<string, number>();

  for (const s of focusCompleted) {
    const dayKey = toDayKey(new Date(s.startedAt));
    totalSec += s.durationSeconds;
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + s.durationSeconds);
    if (dayKey === todayKey) todaySec += s.durationSeconds;
    if (dayKey >= weekCutoff) weekSec += s.durationSeconds;
    if (dayKey >= monthCutoff) monthSec += s.durationSeconds;
  }

  let mostProductiveDayKey: string | null = null;
  let maxSec = 0;
  for (const [k, sec] of byDay.entries()) {
    if (sec > maxSec) {
      maxSec = sec;
      mostProductiveDayKey = k;
    }
  }

  return {
    todayMinutes: Math.round(todaySec / 60),
    weekMinutes: Math.round(weekSec / 60),
    monthMinutes: Math.round(monthSec / 60),
    completedSessions: focusCompleted.length,
    averageMinutes:
      focusCompleted.length === 0 ? 0 : Math.round(totalSec / focusCompleted.length / 60),
    mostProductiveDayKey,
  };
}

export function computeFocusSummary(
  sessions: FocusSession[],
  now: Date,
  goalMinutes = 120,
): FocusSummary {
  const focusCompleted = sessions.filter(
    (s) => s.sessionType === 'focus' && s.status === 'completed',
  );
  const byDay = new Map<string, number>();
  let sessionsToday = 0;
  const todayKey = toDayKey(now);

  for (const s of focusCompleted) {
    const dayKey = toDayKey(new Date(s.startedAt));
    byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + Math.round(s.durationSeconds / 60));
    if (dayKey === todayKey) sessionsToday += 1;
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = toDayKey(addDays(now, i - 6));
    return { date, minutes: byDay.get(date) ?? 0 };
  });

  // Streak backwards from today
  let streakDays = 0;
  for (let i = 0; i < 60; i++) {
    const key = toDayKey(addDays(now, -i));
    if ((byDay.get(key) ?? 0) > 0) {
      streakDays += 1;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }

  return {
    todayMinutes: byDay.get(todayKey) ?? 0,
    goalMinutes,
    sessionsToday,
    streakDays,
    week,
  };
}
