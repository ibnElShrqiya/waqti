import { describe, expect, it } from 'vitest';
import { computeGoalProgress, isGoalOverdue } from '../goals';
import type { Goal } from '../types';

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Goal',
    category: 'personal',
    icon: 'flag',
    color: '#176B56',
    startDate: '2026-11-01',
    priority: 'medium',
    status: 'active',
    manualProgress: 40,
    currentValue: 0,
    milestones: [],
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('goals domain', () => {
  it('computes progress automatically from milestones when present', () => {
    const goal = makeGoal({
      manualProgress: 10,
      milestones: [
        { id: 'm1', goalId: 'g1', title: 'A', isCompleted: true, sortOrder: 0 },
        { id: 'm2', goalId: 'g1', title: 'B', isCompleted: false, sortOrder: 1 },
        { id: 'm3', goalId: 'g1', title: 'C', isCompleted: true, sortOrder: 2 },
      ],
    });
    expect(computeGoalProgress(goal)).toBeCloseTo(2 / 3);
  });

  it('computes progress from numerical target or manual progress when no milestones exist', () => {
    expect(computeGoalProgress(makeGoal({ targetValue: 10, currentValue: 7 }))).toBeCloseTo(0.7);
    expect(computeGoalProgress(makeGoal({ manualProgress: 55 }))).toBeCloseTo(0.55);
    expect(computeGoalProgress(makeGoal({ status: 'completed', manualProgress: 20 }))).toBe(1);
  });

  it('detects overdue active goals', () => {
    expect(isGoalOverdue(makeGoal({ targetDate: '2026-11-17' }), '2026-11-18')).toBe(true);
    expect(isGoalOverdue(makeGoal({ targetDate: '2026-11-18' }), '2026-11-18')).toBe(false);
    expect(isGoalOverdue(makeGoal({ status: 'completed', targetDate: '2026-11-10' }), '2026-11-18')).toBe(false);
  });
});
