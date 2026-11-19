import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type { SubscriptionPlanId, SubscriptionStatus } from '@/domain/types';

export function useAdminOverview(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.overview(),
    queryFn: () => repositories.admin.getOverview(),
    enabled,
  });
}

export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.users(),
    queryFn: () => repositories.admin.listUsers(),
    enabled,
  });
}

export function useAdminConfig(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.config(),
    queryFn: () => repositories.admin.listConfig(),
    enabled,
  });
}

export function useAdminAuditLogs(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.admin.auditLogs(),
    queryFn: () => repositories.admin.listAuditLogs(),
    enabled,
  });
}

export function useAdminMutations() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: queryKeys.admin.all });

  const updateUserSubscription = useMutation({
    mutationFn: ({
      userId,
      planId,
      status,
    }: {
      userId: string;
      planId: SubscriptionPlanId;
      status: SubscriptionStatus;
    }) => repositories.admin.updateUserSubscription(userId, planId, status),
    onSuccess: () => {
      invalidate();
      void qc.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
    },
  });

  const updateConfig = useMutation({
    mutationFn: ({ key, value }: { key: string; value: Record<string, unknown> }) =>
      repositories.admin.updateConfig(key, value),
    onSuccess: invalidate,
  });

  return { updateUserSubscription, updateConfig };
}
