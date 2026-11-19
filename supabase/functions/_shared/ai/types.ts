export type AIProviderName = 'openai' | 'gemini';

export type AIProposedActionType =
  | 'create_task'
  | 'update_task_schedule'
  | 'create_event'
  | 'create_habit'
  | 'update_goal';

export interface AIProposedAction {
  id: string;
  type: AIProposedActionType;
  summary: string;
  payload: Record<string, unknown>;
}

export interface AIChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatInput {
  systemPrompt: string;
  history: AIChatTurn[];
  userMessage: string;
  model?: string;
}

export interface AIUsageMetrics {
  provider: AIProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface AIChatOutput {
  reply: string;
  proposedActions: AIProposedAction[];
  usage: AIUsageMetrics;
}

export interface AIProvider {
  readonly name: AIProviderName;
  chat(input: AIChatInput): Promise<AIChatOutput>;
}
