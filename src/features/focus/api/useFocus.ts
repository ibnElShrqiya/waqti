import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type { FocusPreferences, NewFocusSessionInput } from '@/domain/types';

export function useFocusPreferences() {
  return useQuery({
    queryKey: queryKeys.focus.preferences(),
    queryFn: () => repositories.focus.getPreferences(),
    staleTime: 60_000,
  });
}

export function useFocusSessions() {
  return useQuery({
    queryKey: queryKeys.focus.sessions(),
    queryFn: () => repositories.focus.listSessions(),
    staleTime: 30_000,
  });
}

export function useFocusMutations() {
  const qc = useQueryClient();
  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.focus.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const updatePreferences = useMutation({
    mutationFn: (prefs: FocusPreferences) => repositories.focus.updatePreferences(prefs),
    onSuccess: invalidateAll,
  });

  const createSession = useMutation({
    mutationFn: (input: NewFocusSessionInput) => repositories.focus.createSession(input),
    onSuccess: invalidateAll,
  });

  return { updatePreferences, createSession };
}
