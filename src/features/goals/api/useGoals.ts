import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type {
  NewGoalInput,
  NewMilestoneInput,
  UpdateGoalInput,
  UpdateMilestoneInput,
} from '@/domain/types';
import { usePreferences } from '@/stores/preferences';

export function useGoalsList() {
  const locale = usePreferences((s) => s.locale);
  return useQuery({
    queryKey: queryKeys.goals.list(locale),
    queryFn: () => repositories.goals.list(),
    staleTime: 30_000,
  });
}

export function useGoalMutations() {
  const qc = useQueryClient();
  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.goals.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const createGoal = useMutation({
    mutationFn: (input: NewGoalInput) => repositories.goals.create(input),
    onSuccess: invalidateAll,
  });

  const updateGoal = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateGoalInput }) =>
      repositories.goals.update(id, patch),
    onSuccess: invalidateAll,
  });

  const deleteGoal = useMutation({
    mutationFn: (id: string) => repositories.goals.delete(id),
    onSuccess: invalidateAll,
  });

  const addMilestone = useMutation({
    mutationFn: (input: NewMilestoneInput) => repositories.goals.addMilestone(input),
    onSuccess: invalidateAll,
  });

  const updateMilestone = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateMilestoneInput }) =>
      repositories.goals.updateMilestone(id, patch),
    onSuccess: invalidateAll,
  });

  const deleteMilestone = useMutation({
    mutationFn: (id: string) => repositories.goals.deleteMilestone(id),
    onSuccess: invalidateAll,
  });

  const reorderMilestones = useMutation({
    mutationFn: ({ goalId, orderedIds }: { goalId: string; orderedIds: string[] }) =>
      repositories.goals.reorderMilestones(goalId, orderedIds),
    onSuccess: invalidateAll,
  });

  return {
    createGoal,
    updateGoal,
    deleteGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    reorderMilestones,
  };
}
