/**
 * Telegram client wrapper using gramjs
 */

import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger, LogLevel } from 'telegram/extensions';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Suppress gramjs debug logs - only show errors
Logger.setLevel(LogLevel.NONE);

const UNI_DIR = path.join(process.env.HOME || '~', '.uni');
const SESSION_FILE = path.join(UNI_DIR, 'tokens', 'telegram.session');
const CONFIG_FILE = path.join(UNI_DIR, 'config.toml');

// Default credentials - users don't need to register their own app
const DEFAULT_API_ID = 23908127;
const DEFAULT_API_HASH = 'dd40b2fa3b331a2c13c9d6272fc71cda';

export interface TelegramConfig {
  apiId: number;
  apiHash: string;
  session?: string;
}

// Read config from config.toml
function readConfig(): TelegramConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;

    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');

    // Simple TOML parsing for [telegram] section
    const telegramMatch = content.match(/\[telegram\]([\s\S]*?)(?=\[|$)/);
    if (!telegramMatch) return null;

    const section = telegramMatch[1];
    const apiIdMatch = section.match(/api_id\s*=\s*["']?(\d+)["']?/);
    const apiHashMatch = section.match(/api_hash\s*=\s*["']([^"']+)["']/);
    const sessionMatch = section.match(/session\s*=\s*["']([^"']+)["']/);

    if (!apiIdMatch || !apiHashMatch) return null;

    return {
      apiId: parseInt(apiIdMatch[1], 10),
      apiHash: apiHashMatch[1],
      session: sessionMatch?.[1],
    };
  } catch {
    return null;
  }
}

// Read saved session from file
function readSessionFile(): string | null {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return fs.readFileSync(SESSION_FILE, 'utf-8').trim();
    }
  } catch {
    // ignore
  }
  return null;
}

// Save session to file
export function saveSession(session: string): void {
  const dir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SESSION_FILE, session, 'utf-8');
}

// Delete session file
export function deleteSession(): boolean {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

// Check if authenticated
export function isAuthenticated(): boolean {
  const config = readConfig();
  const savedSession = readSessionFile();

  // Either config has session or session file exists
  return !!(config?.session || savedSession);
}

// Get credentials - from config, environment, or defaults
export function getCredentials(): { apiId: number; apiHash: string } {
  const config = readConfig();

  // Priority: config > env > defaults
  if (config?.apiId && config?.apiHash) {
    return { apiId: config.apiId, apiHash: config.apiHash };
  }

  // Try environment variables
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (apiId && apiHash) {
    return { apiId: parseInt(apiId, 10), apiHash };
  }

  // Use embedded defaults
  return { apiId: DEFAULT_API_ID, apiHash: DEFAULT_API_HASH };
}

// Create and connect client
export async function createClient(): Promise<TelegramClient | null> {
  const creds = getCredentials();

  const config = readConfig();
  const savedSession = readSessionFile();
  const sessionString = config?.session || savedSession || '';

  const session = new StringSession(sessionString);
  const client = new TelegramClient(session, creds.apiId, creds.apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  // Check if actually authorized
  const authorized = await client.checkAuthorization();
  if (!authorized) {
    await client.disconnect();
    return null;
  }

  return client;
}

// Interactive auth flow
export async function authenticateInteractive(
  apiId: number,
  apiHash: string
): Promise<string | null> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  try {
    await client.start({
      phoneNumber: async () => await question('Enter phone number (with country code): '),
      password: async () => await question('Enter 2FA password (if enabled): '),
      phoneCode: async () => await question('Enter the code you received: '),
      onError: (err) => {
        console.error('Auth error:', err.message);
      },
    });

    const sessionString = client.session.save() as unknown as string;
    rl.close();
    await client.disconnect();

    return sessionString;
  } catch (error) {
    rl.close();
    await client.disconnect();
    throw error;
  }
}

// Type exports for commands
export { TelegramClient, Api };
