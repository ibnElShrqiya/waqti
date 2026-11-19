import { GeminiProvider } from './providers/gemini.ts';
import { OpenAIProvider } from './providers/openai.ts';
import type { AIChatInput, AIChatOutput, AIProvider, AIProviderName } from './types.ts';

export function createAIProviderFromEnv(): AIProvider {
  const preferred = (Deno.env.get('AI_PROVIDER') ?? 'gemini').toLowerCase() as AIProviderName;
  const openaiKey = Deno.env.get('OPENAI_API_KEY')?.trim();
  const geminiKey = Deno.env.get('GEMINI_API_KEY')?.trim();

  if (preferred === 'openai') {
    if (!openaiKey) throw new Error('OPENAI_API_KEY is not configured on the server.');
    return new OpenAIProvider(openaiKey, Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini');
  }

  if (geminiKey) {
    return new GeminiProvider(geminiKey, Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash');
  }
  if (openaiKey) {
    return new OpenAIProvider(openaiKey, Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini');
  }

  throw new Error('No AI provider API key is configured on the server (GEMINI_API_KEY or OPENAI_API_KEY).');
}

export class AIService {
  constructor(private readonly provider: AIProvider) {}

  get providerName(): AIProviderName {
    return this.provider.name;
  }

  async generateReply(input: AIChatInput): Promise<AIChatOutput> {
    const trimmed = input.userMessage.trim();
    if (!trimmed || trimmed.length > 4000) {
      throw new Error('Message must be between 1 and 4000 characters.');
    }
    return this.provider.chat({ ...input, userMessage: trimmed });
  }
}
