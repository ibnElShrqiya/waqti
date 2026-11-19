import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type { NotificationPreferences } from '@/domain/types';
import { usePreferences } from '@/stores/preferences';

export function useNotificationsList() {
  const locale = usePreferences((s) => s.locale);
  return useQuery({
    queryKey: queryKeys.notifications.list(locale),
    queryFn: () => repositories.notifications.list(),
    staleTime: 30_000,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: () => repositories.notifications.getPreferences(),
    staleTime: 60_000,
  });
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const updatePreferences = useMutation({
    mutationFn: (prefs: NotificationPreferences) => repositories.notifications.updatePreferences(prefs),
    onSuccess: invalidateAll,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => repositories.notifications.markRead(id),
    onSuccess: invalidateAll,
  });

  const markAllRead = useMutation({
    mutationFn: () => repositories.notifications.markAllRead(),
    onSuccess: invalidateAll,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => repositories.notifications.dismiss(id),
    onSuccess: invalidateAll,
  });

  const savePushSubscription = useMutation({
    mutationFn: ({ endpoint, subscription }: { endpoint: string; subscription: PushSubscriptionJSON }) =>
      repositories.notifications.savePushSubscription(endpoint, subscription),
  });

  const removePushSubscription = useMutation({
    mutationFn: (endpoint: string) => repositories.notifications.removePushSubscription(endpoint),
  });

  return {
    updatePreferences,
    markRead,
    markAllRead,
    dismiss,
    savePushSubscription,
    removePushSubscription,
  };
}
