import type { AIChatInput, AIChatOutput, AIProvider, AIProposedAction } from '../types.ts';

function parseStructuredResponse(raw: string): { reply: string; proposedActions: AIProposedAction[] } {
  try {
    const parsed = JSON.parse(raw) as { reply?: unknown; proposedActions?: unknown };
    const reply = typeof parsed.reply === 'string' ? parsed.reply : raw;
    const actions = Array.isArray(parsed.proposedActions)
      ? (parsed.proposedActions.filter(
          (a): a is AIProposedAction =>
            Boolean(a && typeof a === 'object' && 'type' in a && 'summary' in a && 'payload' in a),
        ))
      : [];
    return { reply, proposedActions: actions };
  } catch {
    return { reply: raw, proposedActions: [] };
  }
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const;
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor(apiKey: string, defaultModel = 'gpt-4o-mini') {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async chat(input: AIChatInput): Promise<AIChatOutput> {
    const model = input.model ?? this.defaultModel;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        temperature: 0.4,
        messages: [
          { role: 'system', content: input.systemPrompt },
          ...input.history,
          { role: 'user', content: input.userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI provider error (${response.status}): ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const content = json.choices?.[0]?.message?.content ?? '';
    const { reply, proposedActions } = parseStructuredResponse(content);
    const inputTokens = json.usage?.prompt_tokens ?? 0;
    const outputTokens = json.usage?.completion_tokens ?? 0;
    const estimatedCost = (inputTokens * 0.00015 + outputTokens * 0.0006) / 1000;

    return {
      reply,
      proposedActions,
      usage: { provider: 'openai', model, inputTokens, outputTokens, estimatedCost },
    };
  }
}
