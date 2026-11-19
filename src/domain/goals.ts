import type { Goal } from './types';

/**
 * Computes goal progress in [0, 1].
 * - If the goal has milestones: ratio of completed milestones.
 * - Else if the goal has a numerical `targetValue > 0`: `currentValue / targetValue`.
 * - Else: `manualProgress / 100`.
 */
export function computeGoalProgress(goal: Goal): number {
  if (goal.status === 'completed') return 1;
  if (goal.milestones.length > 0) {
    const done = goal.milestones.filter((m) => m.isCompleted).length;
    return done / goal.milestones.length;
  }
  if (goal.targetValue && goal.targetValue > 0) {
    return Math.min(1, Math.max(0, goal.currentValue / goal.targetValue));
  }
  return Math.min(1, Math.max(0, goal.manualProgress / 100));
}

export function isGoalOverdue(goal: Goal, todayKey: string): boolean {
  if (goal.status === 'completed' || goal.status === 'archived' || !goal.targetDate) return false;
  return goal.targetDate < todayKey;
}
