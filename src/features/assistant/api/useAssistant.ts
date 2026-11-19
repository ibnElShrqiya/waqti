import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type { AIProposedAction } from '@/domain/types';

export function useAIConversations() {
  return useQuery({
    queryKey: queryKeys.ai.conversations(),
    queryFn: () => repositories.ai.listConversations(),
    staleTime: 30_000,
  });
}

export function useAIMessages(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.ai.messages(conversationId ?? 'none'),
    queryFn: () => (conversationId ? repositories.ai.listMessages(conversationId) : Promise.resolve([])),
    enabled: Boolean(conversationId),
  });
}

export function useAssistantMutations() {
  const qc = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: repositories.ai.sendMessage,
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: queryKeys.ai.conversations() });
      void qc.invalidateQueries({ queryKey: queryKeys.ai.messages(res.conversationId) });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: (conversationId: string) => repositories.ai.deleteConversation(conversationId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.ai.conversations() }),
  });

  const executeAction = useMutation({
    mutationFn: (action: AIProposedAction) => repositories.ai.executeAction(action),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
      void qc.invalidateQueries({ queryKey: queryKeys.habits.all });
      void qc.invalidateQueries({ queryKey: queryKeys.goals.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });

  return { sendMessage, deleteConversation, executeAction };
}
