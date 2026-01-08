/**
 * Core types for the uni CLI
 */

// ============================================================
// Service Definition
// ============================================================

export interface UniService {
  /** Unique service identifier (e.g., 'exa', 'gh', 'gcal') */
  name: string;

  /** Human-readable description */
  description: string;

  /** Service version */
  version: string;

  /** Available commands */
  commands: Command[];

  /** Authentication configuration */
  auth?: AuthConfig;

  /** Called once when service is first loaded */
  setup?: () => Promise<void>;
}

// ============================================================
// Command Definition
// ============================================================

export interface Command {
  /** Command name (e.g., 'search', 'pr', 'list') */
  name: string;

  /** Human-readable description */
  description: string;

  /** Alternative names for this command */
  aliases?: string[];

  /** Positional arguments */
  args?: ArgDef[];

  /** Flag options */
  options?: OptionDef[];

  /** Usage examples */
  examples?: string[];

  /** Command handler */
  handler: (ctx: CommandContext) => Promise<void>;

  /** Nested subcommands */
  subcommands?: Command[];
}

export interface ArgDef {
  /** Argument name */
  name: string;

  /** Description */
  description: string;

  /** Is this argument required? */
  required?: boolean;

  /** Default value */
  default?: string;
}

export interface OptionDef {
  /** Option name (without dashes) */
  name: string;

  /** Short flag (single character) */
  short?: string;

  /** Description */
  description: string;

  /** Value type */
  type: 'string' | 'boolean' | 'number';

  /** Default value */
  default?: string | boolean | number;

  /** Is this option required? */
  required?: boolean;

  /** Allowed values (for enums) */
  choices?: string[];
}

// ============================================================
// Command Context
// ============================================================

export interface CommandContext {
  /** Parsed positional arguments */
  args: Record<string, string>;

  /** Parsed flag values */
  flags: Record<string, string | boolean | number>;

  /** Raw unparsed arguments */
  rawArgs: string[];

  /** Service-specific configuration */
  config: ServiceConfig;

  /** Authentication token (if authenticated) */
  auth: AuthToken | null;

  /** Output formatter */
  output: OutputFormatter;

  /** Interactive prompt helper */
  prompt: PromptHelper;

  /** Global CLI flags */
  globalFlags: GlobalFlags;
}

export interface GlobalFlags {
  json: boolean;
  verbose: boolean;
  quiet: boolean;
  config?: string;
}

export interface ServiceConfig {
  [key: string]: unknown;
}

// ============================================================
// Authentication
// ============================================================

export interface AuthConfig {
  /** Auth type */
  type: 'oauth' | 'token' | 'apikey';

  /** Auth flow for OAuth */
  flow?: 'browser' | 'device' | 'manual';

  /** Required scopes */
  scopes?: string[];

  /** Environment variable name for token/key */
  envVar?: string;

  /** OAuth endpoints (for oauth type) */
  oauth?: {
    authorizeUrl: string;
    tokenUrl: string;
    clientId: string;
    redirectUri?: string;
  };
}

export interface AuthToken {
  /** Access token */
  token: string;

  /** Token type (Bearer, etc.) */
  type?: string;

  /** Expiration timestamp */
  expiresAt?: number;

  /** Refresh token */
  refreshToken?: string;
}

// ============================================================
// Output Formatting
// ============================================================

export interface OutputFormatter {
  /** Check if output should be JSON (only when --json flag is passed) */
  isJsonMode(): boolean;

  /** Check if stdout is being piped (not a TTY) */
  isPiped(): boolean;

  /** Output a value for piping - suppresses other output when piped */
  pipe(value: string): void;

  /** Get the pipe result if set */
  getPipeResult(): string | null;

  /** Output JSON data */
  json(data: unknown): void;

  /** Output a table */
  table(data: Record<string, unknown>[], columns?: string[]): void;

  /** Output plain text */
  text(str: string): void;

  /** Output a list */
  list(items: string[]): void;

  /** Output success message */
  success(msg: string): void;

  /** Output error message */
  error(msg: string): void;

  /** Output warning message */
  warn(msg: string): void;

  /** Output info message */
  info(msg: string): void;

  /** Output debug message (only in verbose mode) */
  debug(msg: string): void;

  /** Start a spinner */
  spinner(msg: string): Spinner;
}

export interface Spinner {
  /** Update spinner text */
  update(msg: string): void;

  /** Stop with success */
  success(msg?: string): void;

  /** Stop with error */
  fail(msg?: string): void;

  /** Stop spinner */
  stop(): void;
}

// ============================================================
// Interactive Prompts
// ============================================================

export interface PromptHelper {
  /** Prompt for text input */
  text(message: string, options?: TextPromptOptions): Promise<string>;

  /** Prompt for confirmation */
  confirm(message: string, defaultValue?: boolean): Promise<boolean>;

  /** Prompt for selection */
  select<T extends string>(
    message: string,
    options: SelectOption<T>[]
  ): Promise<T>;

  /** Prompt for multiple selection */
  multiselect<T extends string>(
    message: string,
    options: SelectOption<T>[]
  ): Promise<T[]>;

  /** Prompt for password (hidden input) */
  password(message: string): Promise<string>;
}

export interface TextPromptOptions {
  default?: string;
  validate?: (value: string) => boolean | string;
  placeholder?: string;
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

// ============================================================
// Config
// ============================================================

export interface UniConfig {
  /** Config version */
  version: string;

  /** Global settings */
  global: GlobalConfig;

  /** Per-service settings */
  services: Record<string, ServiceConfig>;

  /** User-defined command aliases */
  aliases?: Record<string, string>;

  /** uni ask settings */
  ask?: AskConfig;

  /** uni flow macros */
  flows?: Record<string, string[]>;
}

export interface GlobalConfig {
  /** Default output format */
  defaultOutput?: 'human' | 'json';

  /** Enable colors */
  color?: boolean;

  /** Preferred editor */
  editor?: string;

  /** Pager for long output */
  pager?: string;
}

// ============================================================
// LLM Providers & Ask Config
// ============================================================

export type LLMProvider =
  // Tier 1: Major Providers
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'deepseek'
  | 'xai'
  // Tier 2: Chinese Providers
  | 'zhipu'
  | 'moonshot'
  | 'minimax'
  | 'baidu'
  | 'qwen'
  | 'yi'
  // Tier 3: Aggregators & Inference
  | 'openrouter'
  | 'together'
  | 'fireworks'
  | 'replicate'
  | 'groq'
  | 'cerebras'
  // Tier 4: Local & Self-Hosted
  | 'ollama'
  | 'lmstudio'
  | 'vllm'
  | 'localai'
  // Custom
  | 'custom';

export interface AskConfig {
  /** LLM provider */
  provider?: LLMProvider;

  /** Model to use */
  model?: string;

  /** Ask for confirmation before executing */
  confirm?: boolean;

  /** Ollama base URL */
  ollamaUrl?: string;

  /** Timeout in seconds */
  timeout?: number;

  /** Max tokens */
  maxTokens?: number;

  /** Fallback providers */
  fallback?: LLMProvider[];

  /** Provider-specific settings */
  providers?: Record<string, ProviderConfig>;
}

export interface ProviderConfig {
  /** API key environment variable name */
  apiKeyEnv?: string;

  /** Base URL for the API */
  baseUrl?: string;

  /** Custom headers */
  headers?: Record<string, string>;

  /** Provider type for custom providers */
  type?: 'openai-compatible' | 'anthropic-compatible' | 'custom';
}

export interface ModelInfo {
  /** Model ID (used in API calls) */
  id: string;

  /** Human-readable name */
  name: string;

  /** Context window size */
  contextLength: number;

  /** Pricing (per 1M tokens) */
  pricing?: {
    input: number;
    output: number;
  };
}

export interface ProviderInfo {
  /** Provider ID */
  id: LLMProvider;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Tier (1-4) */
  tier: 1 | 2 | 3 | 4;

  /** Available models */
  models: ModelInfo[];

  /** API key environment variable */
  apiKeyEnv?: string;

  /** Default base URL */
  baseUrl: string;

  /** Whether this provider needs API key */
  requiresApiKey: boolean;

  /** Whether it's OpenAI-compatible */
  openaiCompatible: boolean;
}

// ============================================================
// History
// ============================================================

export interface HistoryEntry {
  /** Unique command ID */
  id: number;

  /** Full command string */
  cmd: string;

  /** Execution timestamp (ISO 8601) */
  time: string;

  /** Exit code (0 = success) */
  exit: number;
}

export interface HistoryStore {
  /** Command history entries */
  commands: HistoryEntry[];
}

// ============================================================
// Service Registry
// ============================================================

export interface ServiceMetadata {
  /** Service name */
  name: string;

  /** Service version */
  version: string;

  /** Description */
  description: string;

  /** Source: built-in, plugin, or npm */
  source: 'builtin' | 'plugin' | 'npm';

  /** Path to service module */
  path: string;

  /** Is auth required? */
  authRequired: boolean;

  /** Available commands (for discovery) */
  commands: string[];
}
