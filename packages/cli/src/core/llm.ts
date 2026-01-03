/**
 * LLM client abstraction for uni ask
 */

export type LLMProvider = 'anthropic' | 'openai' | 'ollama' | 'groq';

export interface LLMConfig {
  provider: LLMProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string; // For Ollama
}

export interface LLMClient {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
}

/**
 * Default models per provider
 */
const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: 'claude-3-haiku-20240307',
  openai: 'gpt-4o-mini',
  ollama: 'llama3.2',
  groq: 'llama-3.1-8b-instant',
};

/**
 * Create an LLM client based on config
 */
export function createLLMClient(config: Partial<LLMConfig> = {}): LLMClient {
  const provider = config.provider || detectProvider();

  if (!provider) {
    throw new Error(
      'No LLM provider configured. Set one of:\n' +
      '  - ANTHROPIC_API_KEY\n' +
      '  - OPENAI_API_KEY\n' +
      '  - GROQ_API_KEY\n' +
      '  - Or run Ollama locally'
    );
  }

  const model = config.model || DEFAULT_MODELS[provider];

  switch (provider) {
    case 'anthropic':
      return new AnthropicClient(config.apiKey || process.env.ANTHROPIC_API_KEY!, model);
    case 'openai':
      return new OpenAIClient(config.apiKey || process.env.OPENAI_API_KEY!, model);
    case 'ollama':
      return new OllamaClient(config.baseUrl || 'http://localhost:11434', model);
    case 'groq':
      return new GroqClient(config.apiKey || process.env.GROQ_API_KEY!, model);
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

/**
 * Auto-detect available provider from environment
 */
function detectProvider(): LLMProvider | null {
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GROQ_API_KEY) return 'groq';
  // TODO: Check if Ollama is running
  return null;
}

/**
 * Anthropic Claude client
 */
class AnthropicClient implements LLMClient {
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    return data.content[0]?.text || '';
  }
}

/**
 * OpenAI GPT client
 */
class OpenAIClient implements LLMClient {
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices[0]?.message?.content || '';
  }
}

/**
 * Ollama local client
 */
class OllamaClient implements LLMClient {
  constructor(
    private baseUrl: string,
    private model: string
  ) {}

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}` : prompt;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt: fullPrompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${error}`);
    }

    const data = await response.json() as { response: string };
    return data.response || '';
  }
}

/**
 * Groq client (OpenAI-compatible API)
 */
class GroqClient implements LLMClient {
  constructor(
    private apiKey: string,
    private model: string
  ) {}

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices[0]?.message?.content || '';
  }
}
