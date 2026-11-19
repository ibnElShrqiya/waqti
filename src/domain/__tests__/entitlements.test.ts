import { describe, expect, it } from 'vitest';
import {
  canAccessFeature,
  checkResourceQuota,
  getEffectivePlanId,
  resolveEntitlements,
} from '../entitlements';
import type { UserSubscription } from '../types';

describe('entitlements & subscription rules', () => {
  const now = new Date('2026-11-19T12:00:00.000Z');

  it('grants Pro for active/trialing and active grace period, falls back to Free when expired', () => {
    const activePro: UserSubscription = {
      id: '1',
      planId: 'pro',
      status: 'active',
      provider: 'stripe',
      currentPeriodStart: '2026-11-01T00:00:00.000Z',
      currentPeriodEnd: '2026-12-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    };
    expect(getEffectivePlanId(activePro, now)).toBe('pro');

    const gracePro: UserSubscription = {
      ...activePro,
      status: 'past_due',
      gracePeriodEnd: '2026-11-22T00:00:00.000Z',
    };
    expect(getEffectivePlanId(gracePro, now)).toBe('pro');
    expect(resolveEntitlements(gracePro, undefined, now).inGracePeriod).toBe(true);

    const expiredGrace: UserSubscription = {
      ...activePro,
      status: 'past_due',
      gracePeriodEnd: '2026-11-18T00:00:00.000Z',
    };
    expect(getEffectivePlanId(expiredGrace, now)).toBe('free');
  });

  it('enforces feature flags and resource quotas per plan', () => {
    const freeEnt = resolveEntitlements(null);
    expect(canAccessFeature(freeEnt, 'exportCsv')).toBe(false);
    expect(checkResourceQuota(freeEnt, 'maxActiveHabits', 5)).toEqual({
      allowed: false,
      limit: 5,
      remaining: 0,
    });

    const proEnt = resolveEntitlements({
      id: '2',
      planId: 'pro',
      status: 'active',
      provider: 'manual',
      currentPeriodStart: '2026-11-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    });
    expect(canAccessFeature(proEnt, 'exportCsv')).toBe(true);
    expect(checkResourceQuota(proEnt, 'maxActiveHabits', 50).allowed).toBe(true);
  });
});
