/**
 * LLM Provider Registry
 *
 * Contains all supported LLM providers with their configurations,
 * available models, and provider metadata.
 */

import type { ProviderInfo, ModelInfo, LLMProvider } from '@uni/shared';

// ============================================================
// Model Definitions
// ============================================================

const ANTHROPIC_MODELS: ModelInfo[] = [
  { id: 'claude-opus-4.5-20250520', name: 'Claude Opus 4.5', contextLength: 200000, pricing: { input: 15, output: 75 } },
  { id: 'claude-sonnet-4.5-20250520', name: 'Claude Sonnet 4.5', contextLength: 200000, pricing: { input: 3, output: 15 } },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextLength: 200000, pricing: { input: 3, output: 15 } },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextLength: 200000, pricing: { input: 0.25, output: 1.25 } },
];

const OPENAI_MODELS: ModelInfo[] = [
  { id: 'gpt-5.2', name: 'GPT-5.2', contextLength: 256000, pricing: { input: 10, output: 30 } },
  { id: 'gpt-4o', name: 'GPT-4o', contextLength: 128000, pricing: { input: 5, output: 15 } },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextLength: 128000, pricing: { input: 0.15, output: 0.6 } },
  { id: 'o1', name: 'o1', contextLength: 200000, pricing: { input: 15, output: 60 } },
  { id: 'o1-mini', name: 'o1-mini', contextLength: 200000, pricing: { input: 3, output: 12 } },
];

const GOOGLE_MODELS: ModelInfo[] = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', contextLength: 2000000, pricing: { input: 0.5, output: 1.5 } },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', contextLength: 1000000, pricing: { input: 0.075, output: 0.3 } },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextLength: 2000000, pricing: { input: 1.25, output: 5 } },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextLength: 1000000, pricing: { input: 0.075, output: 0.3 } },
];

const DEEPSEEK_MODELS: ModelInfo[] = [
  { id: 'deepseek-chat', name: 'DeepSeek V3', contextLength: 64000, pricing: { input: 0.14, output: 0.28 } },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', contextLength: 64000, pricing: { input: 0.55, output: 2.19 } },
];

const XAI_MODELS: ModelInfo[] = [
  { id: 'grok-2', name: 'Grok-2', contextLength: 131072, pricing: { input: 2, output: 10 } },
  { id: 'grok-2-mini', name: 'Grok-2 Mini', contextLength: 131072, pricing: { input: 0.4, output: 2 } },
];

const ZHIPU_MODELS: ModelInfo[] = [
  { id: 'glm-4.7', name: 'GLM-4.7', contextLength: 200000, pricing: { input: 5, output: 5 } },
  { id: 'glm-4', name: 'GLM-4', contextLength: 128000, pricing: { input: 5, output: 5 } },
  { id: 'glm-4-flash', name: 'GLM-4 Flash', contextLength: 128000, pricing: { input: 0.1, output: 0.1 } },
];

const MOONSHOT_MODELS: ModelInfo[] = [
  { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K', contextLength: 8192, pricing: { input: 0.6, output: 0.6 } },
  { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K', contextLength: 32768, pricing: { input: 0.6, output: 0.6 } },
  { id: 'moonshot-v1-128k', name: 'Moonshot V1 128K', contextLength: 131072, pricing: { input: 2, output: 2 } },
];

const MINIMAX_MODELS: ModelInfo[] = [
  { id: 'MiniMax-M2.1', name: 'MiniMax M2.1', contextLength: 256000, pricing: { input: 0.2, output: 0.2 } },
  { id: 'MiniMax-M2.1-lightning', name: 'MiniMax M2.1 Lightning', contextLength: 256000, pricing: { input: 0.1, output: 0.1 } },
  { id: 'MiniMax-M2', name: 'MiniMax M2', contextLength: 200000, pricing: { input: 0.2, output: 0.2 } },
];

const BAIDU_MODELS: ModelInfo[] = [
  { id: 'ernie-4.0-8k', name: 'ERNIE-4.0', contextLength: 8000, pricing: { input: 12, output: 12 } },
  { id: 'ernie-4.0-8k-preview', name: 'ERNIE-4.0 Preview', contextLength: 8000, pricing: { input: 4, output: 4 } },
  { id: 'ernie-speed-8k', name: 'ERNIE-Speed', contextLength: 8000, pricing: { input: 0.8, output: 0.8 } },
];

const QWEN_MODELS: ModelInfo[] = [
  { id: 'qwen-max', name: 'Qwen Max', contextLength: 131072, pricing: { input: 1, output: 3 } },
  { id: 'qwen-plus', name: 'Qwen Plus', contextLength: 131072, pricing: { input: 0.4, output: 0.8 } },
  { id: 'qwen-turbo', name: 'Qwen Turbo', contextLength: 131072, pricing: { input: 0.2, output: 0.4 } },
  { id: 'qwen-max-longcontext', name: 'Qwen Max Long', contextLength: 1000000, pricing: { input: 2, output: 6 } },
];

const YI_MODELS: ModelInfo[] = [
  { id: 'yi-large', name: 'Yi-Large', contextLength: 200000, pricing: { input: 3, output: 3 } },
  { id: 'yi-medium', name: 'Yi-Medium', contextLength: 200000, pricing: { input: 0.4, output: 0.4 } },
  { id: 'yi-34b', name: 'Yi-34B', contextLength: 16000, pricing: { input: 0.3, output: 0.3 } },
];

const OPENROUTER_MODELS: ModelInfo[] = [
  // Dynamic - fetch from API, but provide defaults
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', contextLength: 200000 },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', contextLength: 200000 },
  { id: 'openai/gpt-4o', name: 'GPT-4o', contextLength: 128000 },
  { id: 'google/gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', contextLength: 1000000 },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', contextLength: 131072 },
];

const TOGETHER_MODELS: ModelInfo[] = [
  { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', contextLength: 131072, pricing: { input: 0.3, output: 0.3 } },
  { id: 'meta-llama/Llama-3.1-405B-Instruct', name: 'Llama 3.1 405B', contextLength: 131072, pricing: { input: 3, output: 3 } },
  { id: 'meta-llama/Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B', contextLength: 131072, pricing: { input: 0.3, output: 0.3 } },
  { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', contextLength: 32768, pricing: { input: 0.3, output: 0.3 } },
];

const FIREWORKS_MODELS: ModelInfo[] = [
  { id: 'accounts/fireworks/models/llama-v3p1-405b-instruct', name: 'Llama 3.1 405B', contextLength: 131072 },
  { id: 'accounts/fireworks/models/llama-v3p1-70b-instruct', name: 'Llama 3.1 70B', contextLength: 131072 },
  { id: 'accounts/fireworks/models/llama-v3p2-27b-instruct', name: 'Llama 3.2 27B', contextLength: 131072 },
];

const REPLICATE_MODELS: ModelInfo[] = [
  { id: 'meta/meta-llama-3.1-405b-instruct', name: 'Llama 3.1 405B', contextLength: 131072 },
  { id: 'meta/meta-llama-3.1-70b-instruct', name: 'Llama 3.1 70B', contextLength: 131072 },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', contextLength: 131072 },
];

const GROQ_MODELS: ModelInfo[] = [
  { id: 'llama-3.1-405b-reasoning', name: 'Llama 3.1 405B Reasoning', contextLength: 131072, pricing: { input: 5, output: 5 } },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', contextLength: 131072, pricing: { input: 0.6, output: 0.6 } },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', contextLength: 131072, pricing: { input: 0.05, output: 0.05 } },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextLength: 32768, pricing: { input: 0.24, output: 0.24 } },
];

const CEREBRAS_MODELS: ModelInfo[] = [
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', contextLength: 131072, pricing: { input: 0.4, output: 0.4 } },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', contextLength: 131072, pricing: { input: 0.1, output: 0.1 } },
];

const OLLAMA_MODELS: ModelInfo[] = [
  { id: 'llama3.2', name: 'Llama 3.2', contextLength: 131072 },
  { id: 'llama3.1', name: 'Llama 3.1', contextLength: 131072 },
  { id: 'llama3', name: 'Llama 3', contextLength: 8192 },
  { id: 'mistral', name: 'Mistral', contextLength: 32768 },
  { id: 'mixtral', name: 'Mixtral', contextLength: 32768 },
  { id: 'codellama', name: 'Code Llama', contextLength: 16384 },
  { id: 'qwen2.5', name: 'Qwen 2.5', contextLength: 131072 },
  { id: 'gemma2', name: 'Gemma 2', contextLength: 8192 },
  { id: 'deepseek-r1', name: 'DeepSeek R1', contextLength: 131072 },
];

// ============================================================
// Provider Registry
// ============================================================

export const PROVIDERS: Record<LLMProvider, ProviderInfo> = {
  // Tier 1: Major Providers
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models by Anthropic',
    tier: 1,
    models: ANTHROPIC_MODELS,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    baseUrl: 'https://api.anthropic.com/v1',
    requiresApiKey: true,
    openaiCompatible: false,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models by OpenAI',
    tier: 1,
    models: OPENAI_MODELS,
    apiKeyEnv: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    openaiCompatible: true,
  },
  google: {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini models by Google',
    tier: 1,
    models: GOOGLE_MODELS,
    apiKeyEnv: 'GOOGLE_AI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    openaiCompatible: false,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek V3 and R1 models',
    tier: 1,
    models: DEEPSEEK_MODELS,
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/v1',
    requiresApiKey: true,
    openaiCompatible: true,
  },
  xai: {
    id: 'xai',
    name: 'xAI',
    description: 'Grok models by xAI',
    tier: 1,
    models: XAI_MODELS,
    apiKeyEnv: 'XAI_API_KEY',
    baseUrl: 'https://api.x.ai/v1',
    requiresApiKey: true,
    openaiCompatible: true,
  },

  // Tier 2: Chinese Providers
  zhipu: {
    id: 'zhipu',
    name: 'Zhipu AI (GLM)',
    description: 'GLM models by Zhipu AI',
    tier: 2,
    models: ZHIPU_MODELS,
    apiKeyEnv: 'ZHIPU_API_KEY',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    requiresApiKey: true,
    openaiCompatible: true,
  },
  moonshot: {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    description: 'Moonshot AI Kimi models',
    tier: 2,
    models: MOONSHOT_MODELS,
    apiKeyEnv: 'MOONSHOT_API_KEY',
    baseUrl: 'https://api.moonshot.cn/v1',
    requiresApiKey: true,
    openaiCompatible: true,
  },
  minimax: {
    id: 'minimax',
    name: 'Minimax',
    description: 'abab models by Minimax',
    tier: 2,
    models: MINIMAX_MODELS,
    apiKeyEnv: 'MINIMAX_API_KEY',
    baseUrl: 'https://api.minimax.io/anthropic',
    requiresApiKey: true,
    openaiCompatible: false,
  },
  baidu: {
    id: 'baidu',
    name: 'Baidu (ERNIE)',
    description: 'ERNIE models by Baidu',
    tier: 2,
    models: BAIDU_MODELS,
    apiKeyEnv: 'BAIDU_API_KEY',
    baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
    requiresApiKey: true,
    openaiCompatible: false,
  },
  qwen: {
    id: 'qwen',
    name: 'Alibaba (Qwen)',
    description: 'Qwen models by Alibaba',
    tier: 2,
    models: QWEN_MODELS,
    apiKeyEnv: 'DASHSCOPE_API_KEY',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    requiresApiKey: true,
    openaiCompatible: true,
  },
  yi: {
    id: 'yi',
    name: '01.AI (Yi)',
    description: 'Yi models by 01.AI',
    tier: 2,
    models: YI_MODELS,
    apiKeyEnv: 'YI_API_KEY',
    baseUrl: 'https://api.01.ai/v1',
    requiresApiKey: true,
    openaiCompatible: true,
  },

  // Tier 3: Aggregators & Inference
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access 100+ models via one API',
    tier: 3,
    models: OPENROUTER_MODELS,
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    openaiCompatible: true,
  },
  together: {
    id: 'together',
    name: 'Together AI',
    description: 'Open-source model hosting',
    tier: 3,
    models: TOGETHER_MODELS,
    apiKeyEnv: 'TOGETHER_API_KEY',
    baseUrl: 'https://api.together.ai/v1',
    requiresApiKey: true,
    openaiCompatible: true,
  },
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks AI',
    description: 'Fast inference platform',
    tier: 3,
    models: FIREWORKS_MODELS,
    apiKeyEnv: 'FIREWORKS_API_KEY',
    baseUrl: 'https://api.fireworks.ai/v1',
    requiresApiKey: true,
    openaiCompatible: true,
  },
  replicate: {
    id: 'replicate',
    name: 'Replicate',
    description: 'Run any model',
    tier: 3,
    models: REPLICATE_MODELS,
    apiKeyEnv: 'REPLICATE_API_TOKEN',
    baseUrl: 'https://api.replicate.com/v1',
    requiresApiKey: true,
    openaiCompatible: false,
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference',
    tier: 3,
    models: GROQ_MODELS,
    apiKeyEnv: 'GROQ_API_KEY',
    baseUrl: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
    openaiCompatible: true,
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'Fast inference on Cerebras hardware',
    tier: 3,
    models: CEREBRAS_MODELS,
    apiKeyEnv: 'CEREBRAS_API_KEY',
    baseUrl: 'https://api.cerebras.ai/v1',
    requiresApiKey: true,
    openaiCompatible: true,
  },

  // Tier 4: Local & Self-Hosted
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    description: 'Local models with Ollama',
    tier: 4,
    models: OLLAMA_MODELS,
    baseUrl: 'http://localhost:11434',
    requiresApiKey: false,
    openaiCompatible: false,
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    description: 'Local models with LM Studio',
    tier: 4,
    models: OLLAMA_MODELS, // Same models available
    baseUrl: 'http://localhost:1234/v1',
    requiresApiKey: false,
    openaiCompatible: true,
  },
  vllm: {
    id: 'vllm',
    name: 'vLLM',
    description: 'Self-hosted vLLM inference server',
    tier: 4,
    models: [], // User configured
    baseUrl: 'http://localhost:8000/v1',
    requiresApiKey: false,
    openaiCompatible: true,
  },
  localai: {
    id: 'localai',
    name: 'LocalAI',
    description: 'OpenAI-compatible local inference',
    tier: 4,
    models: [], // User configured
    baseUrl: 'http://localhost:8080/v1',
    requiresApiKey: false,
    openaiCompatible: true,
  },

  // Custom
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'User-defined custom provider',
    tier: 4,
    models: [], // User configured
    baseUrl: '',
    requiresApiKey: false,
    openaiCompatible: true,
  },
};

// ============================================================
// Default Models by Provider
// ============================================================

export const DEFAULT_MODEL: Record<LLMProvider, string> = {
  anthropic: 'claude-sonnet-4.5-20250520',
  openai: 'gpt-5.2',
  google: 'gemini-3-pro-preview',
  deepseek: 'deepseek-chat',
  xai: 'grok-2-mini',
  zhipu: 'glm-4.7',
  moonshot: 'moonshot-v1-8k',
  minimax: 'MiniMax-M2.1',
  baidu: 'ernie-speed-8k',
  qwen: 'qwen-turbo',
  yi: 'yi-medium',
  openrouter: 'anthropic/claude-sonnet-4.5',
  together: 'meta-llama/Llama-3.1-70B-Instruct',
  fireworks: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
  replicate: 'meta/meta-llama-3.1-405b-instruct',
  groq: 'llama-3.1-8b-instant',
  cerebras: 'llama-3.1-8b',
  ollama: 'llama3.2',
  lmstudio: 'llama3.2',
  vllm: 'meta-llama/Llama-3.1-70B-Instruct',
  localai: 'llama3.2',
  custom: '',
};

// ============================================================
// Provider Detection Order
// ============================================================

export const PROVIDER_DETECTION_ORDER: LLMProvider[] = [
  'anthropic',
  'openai',
  'openrouter',
  'groq',
  'deepseek',
  'google',
  'together',
  'cerebras',
  'xai',
  'ollama',
  'lmstudio',
];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get provider info by ID
 */
export function getProvider(id: LLMProvider): ProviderInfo | undefined {
  return PROVIDERS[id];
}

/**
 * List all providers
 */
export function listProviders(): ProviderInfo[] {
  return Object.values(PROVIDERS);
}

/**
 * List providers by tier
 */
export function listProvidersByTier(tier: 1 | 2 | 3 | 4): ProviderInfo[] {
  return listProviders().filter((p) => p.tier === tier);
}

/**
 * Get model info for a provider
 */
export function getModels(provider: LLMProvider): ModelInfo[] {
  return PROVIDERS[provider]?.models || [];
}

/**
 * Get a specific model by ID
 */
export function getModel(provider: LLMProvider, modelId: string): ModelInfo | undefined {
  const models = getModels(provider);
  return models.find((m) => m.id === modelId);
}

/**
 * Check if a provider is available (has API key or is local)
 */
export function isProviderAvailable(provider: LLMProvider): boolean {
  const info = PROVIDERS[provider];
  if (!info) return false;

  if (!info.requiresApiKey) {
    return true;
  }

  if (info.apiKeyEnv) {
    return Boolean(process.env[info.apiKeyEnv]);
  }

  return false;
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(provider: LLMProvider): string {
  return DEFAULT_MODEL[provider] || '';
}

/**
 * Get provider by API key environment variable
 */
export function getProviderByApiKeyEnv(envVar: string): LLMProvider | undefined {
  for (const [id, provider] of Object.entries(PROVIDERS)) {
    if (provider.apiKeyEnv === envVar) {
      return id as LLMProvider;
    }
  }
  return undefined;
}
