import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import { resolveEntitlements } from '@/domain/entitlements';
import type { SubscriptionPlanId } from '@/domain/types';

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: queryKeys.subscriptions.plans(),
    queryFn: () => repositories.subscriptions.listPlans(),
    staleTime: 300_000,
  });
}

export function useCurrentSubscription() {
  return useQuery({
    queryKey: queryKeys.subscriptions.current(),
    queryFn: () => repositories.subscriptions.getCurrent(),
    staleTime: 30_000,
  });
}

export function useUsageSnapshot() {
  return useQuery({
    queryKey: queryKeys.subscriptions.usage(),
    queryFn: () => repositories.subscriptions.getUsage(),
    staleTime: 30_000,
  });
}

export function useEntitlements() {
  const plansQuery = useSubscriptionPlans();
  const subQuery = useCurrentSubscription();

  return useMemo(
    () => resolveEntitlements(subQuery.data, plansQuery.data),
    [subQuery.data, plansQuery.data],
  );
}

export function useSubscriptionMutations() {
  const qc = useQueryClient();
  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
    void qc.invalidateQueries({ queryKey: queryKeys.profile.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const requestPlanChange = useMutation({
    mutationFn: (targetPlan: SubscriptionPlanId) =>
      repositories.subscriptions.requestPlanChange(targetPlan),
    onSuccess: invalidateAll,
  });

  const cancelAtPeriodEnd = useMutation({
    mutationFn: () => repositories.subscriptions.cancelAtPeriodEnd(),
    onSuccess: invalidateAll,
  });

  return { requestPlanChange, cancelAtPeriodEnd };
}
