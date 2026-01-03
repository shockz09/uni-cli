/**
 * LLM client abstraction for uni ask
 *
 * Supports multiple providers with a unified interface.
 * Uses provider registry for configuration and model management.
 */

import type { LLMProvider, AskConfig, ProviderConfig } from '@uni/shared';
import {
  PROVIDERS,
  DEFAULT_MODEL,
  PROVIDER_DETECTION_ORDER,
  getProvider,
  isProviderAvailable,
  getDefaultModel,
  type ProviderInfo,
} from './llm-providers';

// ============================================================
// Configuration
// ============================================================

export interface LLMClientConfig {
  /** Provider to use */
  provider?: LLMProvider;

  /** Model to use (overrides default) */
  model?: string;

  /** API key (overrides env var) */
  apiKey?: string;

  /** Base URL (for local/custom providers) */
  baseUrl?: string;

  /** Provider-specific config */
  providerConfig?: ProviderConfig;

  /** Timeout in seconds */
  timeout?: number;

  /** Max tokens */
  maxTokens?: number;
}

// ============================================================
// Client Interface
// ============================================================

export interface LLMClient {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
}

// ============================================================
// Factory Function
// ============================================================

/**
 * Create an LLM client based on config
 */
export function createLLMClient(config: LLMClientConfig = {}): LLMClient {
  const provider = config.provider || detectProvider();

  if (!provider) {
    throw new Error(
      'No LLM provider configured. Set one of:\n' +
      '  - ANTHROPIC_API_KEY (Anthropic Claude)\n' +
      '  - OPENAI_API_KEY (OpenAI GPT)\n' +
      '  - GOOGLE_AI_API_KEY (Google Gemini)\n' +
      '  - DEEPSEEK_API_KEY (DeepSeek)\n' +
      '  - XAI_API_KEY (xAI Grok)\n' +
      '  - OPENROUTER_API_KEY (OpenRouter)\n' +
      '  - GROQ_API_KEY (Groq)\n' +
      '  - Or run Ollama locally\n\n' +
      'Or configure in ~/.uni/config.toml:\n' +
      '  [ask]\n' +
      '  provider = "anthropic"\n' +
      '  model = "claude-3-5-sonnet-20241022"'
    );
  }

  const providerInfo = getProvider(provider)!;
  const model = config.model || DEFAULT_MODEL[provider] || '';
  const apiKey = config.apiKey || getApiKey(provider, config.providerConfig);
  const baseUrl = config.baseUrl || providerInfo.baseUrl;

  return createClient(provider, providerInfo, model, apiKey, baseUrl, config.timeout, config.maxTokens);
}

/**
 * Create a client for a specific provider
 */
function createClient(
  provider: LLMProvider,
  providerInfo: ProviderInfo,
  model: string,
  apiKey?: string,
  baseUrl?: string,
  timeout?: number,
  maxTokens?: number
): LLMClient {
  if (providerInfo.openaiCompatible) {
    return new OpenAICompatibleClient(provider, model, apiKey || '', baseUrl || providerInfo.baseUrl, timeout, maxTokens);
  }

  switch (provider) {
    case 'anthropic':
      return new AnthropicClient(apiKey || '', model, timeout, maxTokens);
    case 'minimax':
      return new AnthropicClient(apiKey || '', model, timeout, maxTokens, baseUrl || 'https://api.minimax.io/anthropic');
    case 'google':
      return new GoogleClient(apiKey || '', model, timeout, maxTokens);
    case 'ollama':
      return new OllamaClient(baseUrl || 'http://localhost:11434', model);
    default:
      return new OpenAICompatibleClient(provider, model, apiKey || '', baseUrl || providerInfo.baseUrl, timeout, maxTokens);
  }
}

// ============================================================
// Provider Detection
// ============================================================

/**
 * Auto-detect available provider from environment
 */
export function detectProvider(): LLMProvider | null {
  for (const provider of PROVIDER_DETECTION_ORDER) {
    if (isProviderAvailable(provider)) {
      return provider;
    }
  }
  return null;
}

/**
 * Get API key for a provider
 */
function getApiKey(provider: LLMProvider, providerConfig?: ProviderConfig): string | undefined {
  const info = getProvider(provider);
  if (!info) return undefined;

  // Check provider-specific config first
  if (providerConfig?.apiKeyEnv) {
    return process.env[providerConfig.apiKeyEnv];
  }

  // Check default env var
  if (info.apiKeyEnv) {
    return process.env[info.apiKeyEnv];
  }

  return undefined;
}

// ============================================================
// Base Client (OpenAI-Compatible)
// ============================================================

class OpenAICompatibleClient implements LLMClient {
  constructor(
    private provider: string,
    private model: string,
    private apiKey: string,
    private baseUrl: string,
    private timeout?: number,
    private maxTokens?: number
  ) {}

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (this.timeout || 30) * 1000);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          // OpenRouter-specific headers
          'HTTP-Referer': 'https://uni-cli.dev',
          'X-Title': 'uni-cli',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: this.maxTokens || 1024,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${this.provider} API error: ${error}`);
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };

      return data.choices[0]?.message?.content || '';
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`${this.provider} request timed out`);
      }
      throw error;
    }
  }
}

// ============================================================
// Anthropic Client
// ============================================================

class AnthropicClient implements LLMClient {
  constructor(
    private apiKey: string,
    private model: string,
    private timeout?: number,
    private maxTokens?: number,
    private baseUrl: string = 'https://api.anthropic.com'
  ) {}

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (this.timeout || 30) * 1000);

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens || 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Anthropic API error: ${error}`);
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };

      return data.content[0]?.text || '';
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Anthropic request timed out');
      }
      throw error;
    }
  }
}

// ============================================================
// Google AI Client
// ============================================================

class GoogleClient implements LLMClient {
  constructor(
    private apiKey: string,
    private model: string,
    private timeout?: number,
    private maxTokens?: number
  ) {}

  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (this.timeout || 30) * 1000);

    try {
      const contents = [{ role: 'user', parts: [{ text: prompt }] }];

      // Add system instruction if provided
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const body: Record<string, unknown> = {
        contents,
        generationConfig: {
          maxOutputTokens: this.maxTokens || 1024,
        },
      };

      if (systemPrompt) {
        // Google uses systemInstruction instead of system message
        (body as { systemInstruction?: { role: string; parts: Array<{ text: string }> } }).systemInstruction = {
          role: 'system',
          parts: [{ text: systemPrompt }],
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google API error: ${error}`);
      }

      const data = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Google API request timed out');
      }
      throw error;
    }
  }
}

// ============================================================
// Ollama Client (Non-OpenAI Compatible)
// ============================================================

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

// ============================================================
// Utility Functions
// ============================================================

/**
 * Get the list of all supported providers
 */
export function getSupportedProviders(): LLMProvider[] {
  return Object.keys(PROVIDERS) as LLMProvider[];
}

/**
 * Get provider display name
 */
export function getProviderName(provider: LLMProvider): string {
  return PROVIDERS[provider]?.name || provider;
}

/**
 * Check if a provider is configured
 */
export function isConfigured(provider: LLMProvider): boolean {
  const info = PROVIDERS[provider];
  if (!info) return false;

  if (!info.requiresApiKey) return true;

  if (info.apiKeyEnv) {
    return Boolean(process.env[info.apiKeyEnv]);
  }

  return false;
}

/**
 * Get available (configured) providers
 */
export function getAvailableProviders(): LLMProvider[] {
  return getSupportedProviders().filter(isConfigured);
}

/**
 * Get the default model for a provider
 */
export function getModelForProvider(provider: LLMProvider): string {
  return getDefaultModel(provider);
}

/**
 * Test if a provider is reachable
 */
export async function testProvider(provider: LLMProvider): Promise<{ success: boolean; error?: string }> {
  const info = getProvider(provider);
  if (!info) {
    return { success: false, error: 'Unknown provider' };
  }

  if (!isConfigured(provider)) {
    const envHint = info.apiKeyEnv ? ` (set ${info.apiKeyEnv})` : '';
    return { success: false, error: `Provider not configured${envHint}` };
  }

  try {
    const client = createLLMClient({ provider });
    await client.complete('Hello', 'You are a helpful assistant.');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
