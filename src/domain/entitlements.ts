import type {
  PlanEntitlementFlags,
  PlanLimits,
  SubscriptionPlan,
  SubscriptionPlanId,
  UserSubscription,
} from './types';

export const PLAN_CATALOG: Record<SubscriptionPlanId, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Core task management, basic calendar, habits, and daily statistics.',
    priceMonthlyCents: 0,
    priceYearlyCents: 0,
    entitlements: {
      advancedAnalytics: false,
      exportCsv: false,
      rafiqAdvanced: false,
      unlimitedHabits: false,
      unlimitedGoals: false,
    },
    limits: {
      maxActiveHabits: 5,
      maxActiveGoals: 3,
      dailyAiRequests: 10,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Advanced analytics, CSV exports, unlimited habits and goals, and full Rafiq AI.',
    priceMonthlyCents: 900,
    priceYearlyCents: 8400,
    entitlements: {
      advancedAnalytics: true,
      exportCsv: true,
      rafiqAdvanced: true,
      unlimitedHabits: true,
      unlimitedGoals: true,
    },
    limits: {
      maxActiveHabits: 9999,
      maxActiveGoals: 9999,
      dailyAiRequests: 200,
    },
  },
};

export function getEffectivePlanId(
  subscription: UserSubscription | null | undefined,
  now = new Date(),
): SubscriptionPlanId {
  if (!subscription || subscription.planId !== 'pro') return 'free';
  const nowMs = now.getTime();

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    if (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd).getTime() >= nowMs) {
      return 'pro';
    }
    return 'free';
  }

  if (subscription.status === 'past_due' && subscription.gracePeriodEnd) {
    return new Date(subscription.gracePeriodEnd).getTime() >= nowMs ? 'pro' : 'free';
  }

  if (subscription.status === 'canceled' && subscription.currentPeriodEnd) {
    return new Date(subscription.currentPeriodEnd).getTime() >= nowMs ? 'pro' : 'free';
  }

  return 'free';
}

export interface ResolvedEntitlements {
  effectivePlan: SubscriptionPlanId;
  flags: PlanEntitlementFlags;
  limits: PlanLimits;
  inGracePeriod: boolean;
}

export function resolveEntitlements(
  subscription: UserSubscription | null | undefined,
  plans: SubscriptionPlan[] = Object.values(PLAN_CATALOG),
  now = new Date(),
): ResolvedEntitlements {
  const effectivePlan = getEffectivePlanId(subscription, now);
  const plan = plans.find((p) => p.id === effectivePlan) ?? PLAN_CATALOG[effectivePlan];
  const inGracePeriod =
    effectivePlan === 'pro' &&
    subscription?.status === 'past_due' &&
    Boolean(subscription.gracePeriodEnd);

  return {
    effectivePlan,
    flags: plan.entitlements,
    limits: plan.limits,
    inGracePeriod,
  };
}

export function canAccessFeature(
  entitlements: ResolvedEntitlements,
  feature: keyof PlanEntitlementFlags,
): boolean {
  return Boolean(entitlements.flags[feature]);
}

export function checkResourceQuota(
  entitlements: ResolvedEntitlements,
  resource: keyof PlanLimits,
  currentCount: number,
): { allowed: boolean; limit: number; remaining: number } {
  const limit = entitlements.limits[resource];
  return {
    allowed: currentCount < limit,
    limit,
    remaining: Math.max(0, limit - currentCount),
  };
}
