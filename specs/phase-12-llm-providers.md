# Phase 12: Comprehensive LLM Provider Support

> Status: 📋 PLANNED (Future)

## Overview
Full LLM provider ecosystem for `uni ask`. Support for all major providers, OpenRouter aggregation, and custom provider configuration.

---

## Providers to Support

### Tier 1: Major Providers
| Provider | Models | Auth |
|----------|--------|------|
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus/Haiku | `ANTHROPIC_API_KEY` |
| **OpenAI** | GPT-4o, GPT-4o-mini, o1, o1-mini | `OPENAI_API_KEY` |
| **Google** | Gemini 2.0, Gemini 1.5 Pro/Flash | `GOOGLE_AI_API_KEY` |
| **DeepSeek** | DeepSeek-V3, DeepSeek-R1 | `DEEPSEEK_API_KEY` |
| **xAI** | Grok-2, Grok-2-mini | `XAI_API_KEY` |

### Tier 2: Chinese Providers
| Provider | Models | Auth |
|----------|--------|------|
| **Zhipu AI (GLM)** | GLM-4, GLM-4-Flash | `ZHIPU_API_KEY` |
| **Moonshot (Kimi)** | Kimi-K1, Moonshot-v1 | `MOONSHOT_API_KEY` |
| **Minimax** | abab6.5, abab5.5 | `MINIMAX_API_KEY` |
| **Baidu (ERNIE)** | ERNIE-4.0, ERNIE-Speed | `BAIDU_API_KEY` |
| **Alibaba (Qwen)** | Qwen-Max, Qwen-Turbo | `DASHSCOPE_API_KEY` |
| **01.AI (Yi)** | Yi-Large, Yi-Medium | `YI_API_KEY` |

### Tier 3: Aggregators & Inference
| Provider | Description | Auth |
|----------|-------------|------|
| **OpenRouter** | Access 100+ models via one API | `OPENROUTER_API_KEY` |
| **Together AI** | Open-source model hosting | `TOGETHER_API_KEY` |
| **Fireworks AI** | Fast inference | `FIREWORKS_API_KEY` |
| **Replicate** | Run any model | `REPLICATE_API_TOKEN` |
| **Groq** | Ultra-fast inference | `GROQ_API_KEY` |
| **Cerebras** | Fast inference | `CEREBRAS_API_KEY` |

### Tier 4: Local & Self-Hosted
| Provider | Description | Auth |
|----------|-------------|------|
| **Ollama** | Local models | None (localhost) |
| **LM Studio** | Local with OpenAI-compatible API | None (localhost) |
| **vLLM** | Self-hosted inference | Custom URL |
| **Text Generation WebUI** | Gradio-based | Custom URL |
| **LocalAI** | OpenAI-compatible local | Custom URL |

---

## Configuration

### Basic Config
```toml
# ~/.uni/config.toml
[ask]
provider = "anthropic"
model = "claude-3-5-sonnet-20241022"
confirm = true
```

### Advanced Config
```toml
[ask]
provider = "openrouter"
model = "anthropic/claude-3.5-sonnet"
fallback = ["groq/llama-3.1-70b", "ollama/llama3.2"]
timeout = 30
max_tokens = 1024

[ask.providers.openrouter]
api_key_env = "OPENROUTER_API_KEY"
site_url = "https://uni-cli.dev"
site_name = "uni-cli"

[ask.providers.ollama]
base_url = "http://localhost:11434"
```

### Custom Provider
```toml
[ask.providers.custom]
name = "my-provider"
base_url = "https://api.my-provider.com/v1"
api_key_env = "MY_PROVIDER_API_KEY"
type = "openai-compatible"  # openai-compatible | anthropic-compatible | custom
headers = { "X-Custom-Header" = "value" }

# For fully custom APIs
[ask.providers.custom.request]
method = "POST"
path = "/chat/completions"
body_template = '''
{
  "model": "{{model}}",
  "messages": {{messages}},
  "max_tokens": {{max_tokens}}
}
'''

[ask.providers.custom.response]
content_path = "choices[0].message.content"
```

---

## Commands

### Provider Management
```bash
# List available providers
uni ask providers

# Test a provider
uni ask test --provider deepseek

# Set default provider
uni config set ask.provider openrouter
uni config set ask.model "anthropic/claude-3.5-sonnet"
```

### Model Selection
```bash
# Use specific provider
uni ask "query" --provider deepseek

# Use specific model
uni ask "query" --model gpt-4o

# Use OpenRouter with model
uni ask "query" --provider openrouter --model "google/gemini-2.0-flash"
```

---

## Implementation

### Provider Interface
```typescript
interface LLMProvider {
  name: string;
  displayName: string;
  type: 'openai' | 'anthropic' | 'custom';
  baseUrl: string;
  models: ModelInfo[];

  // Auth
  apiKeyEnv?: string;
  apiKey?: string;

  // Request customization
  headers?: Record<string, string>;
  requestTransform?: (req: LLMRequest) => unknown;
  responseTransform?: (res: unknown) => string;
}

interface ModelInfo {
  id: string;
  name: string;
  contextLength: number;
  pricing?: { input: number; output: number };
}
```

### Provider Registry
```typescript
// Built-in providers
const PROVIDERS: Record<string, LLMProvider> = {
  anthropic: { ... },
  openai: { ... },
  deepseek: {
    name: 'deepseek',
    displayName: 'DeepSeek',
    type: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3', contextLength: 64000 },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1', contextLength: 64000 },
    ],
  },
  openrouter: {
    name: 'openrouter',
    displayName: 'OpenRouter',
    type: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    headers: {
      'HTTP-Referer': 'https://uni-cli.dev',
      'X-Title': 'uni-cli',
    },
    models: [], // Dynamic from API
  },
  // ... more providers
};
```

### OpenAI-Compatible Providers
Many providers use OpenAI-compatible APIs:
- DeepSeek
- Groq
- Together AI
- Fireworks AI
- OpenRouter
- Ollama
- LM Studio
- vLLM

For these, just change `baseUrl` and use the same client.

---

## Files to Create/Modify

```
packages/cli/src/
├── core/
│   ├── llm.ts              # Enhance with all providers
│   ├── llm-providers.ts    # Provider definitions
│   └── llm-registry.ts     # Provider registry
```

---

## Environment Variables

```bash
# Tier 1
export ANTHROPIC_API_KEY="..."
export OPENAI_API_KEY="..."
export GOOGLE_AI_API_KEY="..."
export DEEPSEEK_API_KEY="..."
export XAI_API_KEY="..."

# Tier 2 (Chinese)
export ZHIPU_API_KEY="..."
export MOONSHOT_API_KEY="..."
export MINIMAX_API_KEY="..."
export BAIDU_API_KEY="..."
export DASHSCOPE_API_KEY="..."
export YI_API_KEY="..."

# Tier 3 (Aggregators)
export OPENROUTER_API_KEY="..."
export TOGETHER_API_KEY="..."
export FIREWORKS_API_KEY="..."
export REPLICATE_API_TOKEN="..."
export GROQ_API_KEY="..."
export CEREBRAS_API_KEY="..."
```

---

## Auto-Detection Priority

When no provider is configured, detect in this order:
1. `ANTHROPIC_API_KEY` → Anthropic
2. `OPENAI_API_KEY` → OpenAI
3. `OPENROUTER_API_KEY` → OpenRouter
4. `GROQ_API_KEY` → Groq
5. `DEEPSEEK_API_KEY` → DeepSeek
6. Check if Ollama running → Ollama
7. Error with setup instructions

---

## Fallback Chain

```toml
[ask]
provider = "anthropic"
fallback = ["openrouter", "groq", "ollama"]
```

If primary fails:
1. Try next in fallback list
2. Show warning about fallback
3. Continue with working provider

---

## OpenRouter Special Features

OpenRouter provides access to 100+ models:

```bash
# Use any model via OpenRouter
uni ask "query" --provider openrouter --model "anthropic/claude-3.5-sonnet"
uni ask "query" --provider openrouter --model "google/gemini-2.0-flash-exp"
uni ask "query" --provider openrouter --model "deepseek/deepseek-r1"
uni ask "query" --provider openrouter --model "meta-llama/llama-3.3-70b"

# List available models
uni ask models --provider openrouter
```

---

## Testing Checklist
- [ ] All Tier 1 providers work
- [ ] All Tier 2 providers work
- [ ] OpenRouter integration works
- [ ] Local providers (Ollama, LM Studio) work
- [ ] Custom provider config works
- [ ] Fallback chain works
- [ ] Auto-detection works correctly
- [ ] Provider listing command works
- [ ] Model selection works
