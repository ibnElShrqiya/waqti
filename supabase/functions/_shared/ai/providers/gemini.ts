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

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor(apiKey: string, defaultModel = 'gemini-2.0-flash') {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async chat(input: AIChatInput): Promise<AIChatOutput> {
    const model = input.model ?? this.defaultModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const contents = [
      ...input.history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: input.userMessage }] },
    ];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.systemPrompt }] },
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini provider error (${response.status}): ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    const content = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const { reply, proposedActions } = parseStructuredResponse(content);
    const inputTokens = json.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = json.usageMetadata?.candidatesTokenCount ?? 0;
    const estimatedCost = (inputTokens * 0.0001 + outputTokens * 0.0004) / 1000;

    return {
      reply,
      proposedActions,
      usage: { provider: 'gemini', model, inputTokens, outputTokens, estimatedCost },
    };
  }
}
