/**
 * Credential Management
 *
 * Provides default credentials for uni-cli services and handles
 * credential resolution with priority: config > env > defaults
 *
 * Note: Client ID and Secret are intentionally public for desktop OAuth apps.
 * Security comes from the user consent flow, not secret credentials.
 */

import { config } from './config';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ============================================================
// Default Credentials (Embedded)
// ============================================================

/**
 * Default credentials for uni-cli
 * These are public OAuth credentials - normal for desktop/CLI apps
 */
export const DEFAULT_CREDENTIALS = {
  google: {
    // uni-cli's Google Cloud Project credentials
    // Users can override with their own in config or env
    clientId: '702702198921-c1dp3v9sn4l9au9nobmimmau5a41lm2p.apps.googleusercontent.com',
    clientSecret: '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',
  },
  slack: {
    // Slack app credentials (placeholder - needs real app)
    clientId: '',
    clientSecret: '',
  },
  notion: {
    // Notion integration credentials (placeholder - needs real integration)
    clientId: '',
    clientSecret: '',
  },
};

// ============================================================
// Credential Types
// ============================================================

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
}

export interface SlackCredentials {
  botToken?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface NotionCredentials {
  token?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface CredentialSource {
  source: 'config' | 'env' | 'default';
  name?: string; // e.g., "uni-cli default" or "custom"
}

// ============================================================
// Credential Resolution
// ============================================================

/**
 * Get Google credentials with resolution priority:
 * 1. User config (~/.uni/config.toml)
 * 2. Environment variables
 * 3. Default credentials
 */
export function getGoogleCredentials(): GoogleCredentials & { source: CredentialSource } {
  const configClientId = config.get('google.clientId') as string | undefined;
  const configClientSecret = config.get('google.clientSecret') as string | undefined;

  const envClientId = process.env.GOOGLE_CLIENT_ID;
  const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Priority: config > env > default
  let clientId: string;
  let clientSecret: string;
  let source: CredentialSource;

  if (configClientId && configClientSecret) {
    clientId = configClientId;
    clientSecret = configClientSecret;
    source = { source: 'config', name: 'custom' };
  } else if (envClientId && envClientSecret) {
    clientId = envClientId;
    clientSecret = envClientSecret;
    source = { source: 'env', name: 'environment' };
  } else {
    clientId = DEFAULT_CREDENTIALS.google.clientId;
    clientSecret = DEFAULT_CREDENTIALS.google.clientSecret;
    source = { source: 'default', name: 'uni-cli default' };
  }

  return { clientId, clientSecret, source };
}

/**
 * Get Slack credentials
 * Priority: config > env > default
 */
export function getSlackCredentials(): SlackCredentials & { source: CredentialSource } {
  // Bot token (most common for Slack)
  const configBotToken = config.get('slack.botToken') as string | undefined;
  const envBotToken = process.env.SLACK_BOT_TOKEN;

  // OAuth credentials (for OAuth flow)
  const configClientId = config.get('slack.clientId') as string | undefined;
  const configClientSecret = config.get('slack.clientSecret') as string | undefined;

  let source: CredentialSource;

  if (configBotToken) {
    source = { source: 'config', name: 'custom' };
    return { botToken: configBotToken, source };
  }

  if (envBotToken) {
    source = { source: 'env', name: 'environment' };
    return { botToken: envBotToken, source };
  }

  if (configClientId && configClientSecret) {
    source = { source: 'config', name: 'custom' };
    return { clientId: configClientId, clientSecret: configClientSecret, source };
  }

  // Default credentials (if available)
  if (DEFAULT_CREDENTIALS.slack.clientId) {
    source = { source: 'default', name: 'uni-cli default' };
    return {
      clientId: DEFAULT_CREDENTIALS.slack.clientId,
      clientSecret: DEFAULT_CREDENTIALS.slack.clientSecret,
      source,
    };
  }

  return { source: { source: 'default', name: 'not configured' } };
}

/**
 * Get Notion credentials
 * Priority: config > env > default
 */
export function getNotionCredentials(): NotionCredentials & { source: CredentialSource } {
  // Integration token (most common for Notion)
  const configToken = config.get('notion.token') as string | undefined;
  const envToken = process.env.NOTION_TOKEN;

  // OAuth credentials (for OAuth flow)
  const configClientId = config.get('notion.clientId') as string | undefined;
  const configClientSecret = config.get('notion.clientSecret') as string | undefined;

  let source: CredentialSource;

  if (configToken) {
    source = { source: 'config', name: 'custom' };
    return { token: configToken, source };
  }

  if (envToken) {
    source = { source: 'env', name: 'environment' };
    return { token: envToken, source };
  }

  if (configClientId && configClientSecret) {
    source = { source: 'config', name: 'custom' };
    return { clientId: configClientId, clientSecret: configClientSecret, source };
  }

  // Default credentials (if available)
  if (DEFAULT_CREDENTIALS.notion.clientId) {
    source = { source: 'default', name: 'uni-cli default' };
    return {
      clientId: DEFAULT_CREDENTIALS.notion.clientId,
      clientSecret: DEFAULT_CREDENTIALS.notion.clientSecret,
      source,
    };
  }

  return { source: { source: 'default', name: 'not configured' } };
}

// ============================================================
// Token Management
// ============================================================

const TOKENS_DIR = path.join(process.env.HOME || '~', '.uni/tokens');

/**
 * Get token file path for a service
 */
export function getTokenPath(service: string): string {
  return path.join(TOKENS_DIR, `${service}.json`);
}

/**
 * Ensure tokens directory exists
 */
export function ensureTokensDir(): void {
  if (!fs.existsSync(TOKENS_DIR)) {
    fs.mkdirSync(TOKENS_DIR, { recursive: true });
  }
}

/**
 * Check if a token exists for a service
 */
export function hasToken(service: string): boolean {
  return fs.existsSync(getTokenPath(service));
}

/**
 * Load token for a service
 */
export function loadToken<T>(service: string): T | null {
  const tokenPath = getTokenPath(service);
  try {
    if (fs.existsSync(tokenPath)) {
      const data = fs.readFileSync(tokenPath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Save token for a service
 */
export function saveToken(service: string, token: unknown): void {
  ensureTokensDir();
  const tokenPath = getTokenPath(service);
  fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2));
}

/**
 * Remove token for a service
 */
export function removeToken(service: string): boolean {
  const tokenPath = getTokenPath(service);
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
    return true;
  }
  return false;
}

/**
 * List all services with saved tokens
 */
export function listTokens(): string[] {
  try {
    if (!fs.existsSync(TOKENS_DIR)) {
      return [];
    }
    return fs.readdirSync(TOKENS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

// ============================================================
// Shared Credentials Import
// ============================================================

export interface SharedCredentials {
  name?: string;
  google?: {
    clientId: string;
    clientSecret: string;
  };
  slack?: {
    clientId?: string;
    clientSecret?: string;
    botToken?: string;
  };
  notion?: {
    clientId?: string;
    clientSecret?: string;
    token?: string;
  };
}

/**
 * Import credentials from a shared credentials file/URL
 */
export async function importSharedCredentials(source: string): Promise<SharedCredentials> {
  let content: string;

  if (source.startsWith('http://') || source.startsWith('https://')) {
    // Fetch from URL
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch credentials: ${response.statusText}`);
    }
    content = await response.text();
  } else if (source.startsWith('gist:')) {
    // GitHub Gist shorthand
    const gistId = source.replace('gist:', '');
    const response = await fetch(`https://api.github.com/gists/${gistId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch gist: ${response.statusText}`);
    }
    const gist = await response.json() as { files: Record<string, { content: string }> };
    const files = Object.values(gist.files);
    if (files.length === 0) {
      throw new Error('Gist has no files');
    }
    content = files[0].content;
  } else {
    // Local file
    if (!fs.existsSync(source)) {
      throw new Error(`File not found: ${source}`);
    }
    content = fs.readFileSync(source, 'utf-8');
  }

  try {
    return JSON.parse(content) as SharedCredentials;
  } catch {
    throw new Error('Invalid credentials format (expected JSON)');
  }
}

/**
 * Save imported credentials to config
 */
export async function saveSharedCredentials(creds: SharedCredentials): Promise<void> {
  if (creds.google) {
    await config.set('google.clientId', creds.google.clientId);
    await config.set('google.clientSecret', creds.google.clientSecret);
  }

  if (creds.slack) {
    if (creds.slack.botToken) {
      await config.set('slack.botToken', creds.slack.botToken);
    }
    if (creds.slack.clientId) {
      await config.set('slack.clientId', creds.slack.clientId);
    }
    if (creds.slack.clientSecret) {
      await config.set('slack.clientSecret', creds.slack.clientSecret);
    }
  }

  if (creds.notion) {
    if (creds.notion.token) {
      await config.set('notion.token', creds.notion.token);
    }
    if (creds.notion.clientId) {
      await config.set('notion.clientId', creds.notion.clientId);
    }
    if (creds.notion.clientSecret) {
      await config.set('notion.clientSecret', creds.notion.clientSecret);
    }
  }
}

// ============================================================
// Credential Initialization
// ============================================================

/**
 * Initialize credentials at CLI startup.
 *
 * This sets environment variables from config/defaults if they're not already set.
 * This allows service APIs to read credentials via environment variables as they normally do,
 * while benefiting from config resolution and default credentials.
 */
export function initializeCredentials(): void {
  // Load config synchronously if not already loaded
  // Note: We do a simple file check here to avoid async issues at startup

  const configPath = path.join(process.env.HOME || '~', '.uni/config.toml');

  let configClientId: string | undefined;
  let configClientSecret: string | undefined;
  let configSlackBotToken: string | undefined;
  let configNotionToken: string | undefined;

  // Try to read config file
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');

      // Simple TOML parsing for credentials
      const clientIdMatch = content.match(/clientId\s*=\s*"([^"]+)"/);
      const clientSecretMatch = content.match(/clientSecret\s*=\s*"([^"]+)"/);
      const slackBotTokenMatch = content.match(/botToken\s*=\s*"([^"]+)"/);
      const notionTokenMatch = content.match(/\[notion\][\s\S]*?token\s*=\s*"([^"]+)"/);

      // Check if these are in the [google] section
      const googleSection = content.match(/\[google\]([\s\S]*?)(?:\[|$)/);
      if (googleSection) {
        const googleClientId = googleSection[1].match(/clientId\s*=\s*"([^"]+)"/);
        const googleClientSecret = googleSection[1].match(/clientSecret\s*=\s*"([^"]+)"/);
        if (googleClientId) configClientId = googleClientId[1];
        if (googleClientSecret) configClientSecret = googleClientSecret[1];
      }

      if (slackBotTokenMatch) configSlackBotToken = slackBotTokenMatch[1];
      if (notionTokenMatch) configNotionToken = notionTokenMatch[1];
    }
  } catch {
    // Ignore errors reading config
  }

  // Set Google credentials
  // Priority: already set env > config > default
  if (!process.env.GOOGLE_CLIENT_ID) {
    if (configClientId) {
      process.env.GOOGLE_CLIENT_ID = configClientId;
    } else if (DEFAULT_CREDENTIALS.google.clientId) {
      process.env.GOOGLE_CLIENT_ID = DEFAULT_CREDENTIALS.google.clientId;
    }
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    if (configClientSecret) {
      process.env.GOOGLE_CLIENT_SECRET = configClientSecret;
    } else if (DEFAULT_CREDENTIALS.google.clientSecret) {
      process.env.GOOGLE_CLIENT_SECRET = DEFAULT_CREDENTIALS.google.clientSecret;
    }
  }

  // Set Slack credentials
  if (!process.env.SLACK_BOT_TOKEN && configSlackBotToken) {
    process.env.SLACK_BOT_TOKEN = configSlackBotToken;
  }

  // Set Notion credentials
  if (!process.env.NOTION_TOKEN && configNotionToken) {
    process.env.NOTION_TOKEN = configNotionToken;
  }
}
