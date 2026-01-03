/**
 * Health Check (uni doctor)
 *
 * Shows the status of all services, credentials, and LLM providers.
 */

import * as c from '../utils/colors';
import {
  getGoogleCredentials,
  getSlackCredentials,
  getNotionCredentials,
  hasToken,
} from './credentials';
import { config } from './config';
import { PROVIDERS } from './llm-providers';
import type { LLMProvider } from '@uni/shared';

// ============================================================
// Service Status Types
// ============================================================

export interface ServiceStatus {
  name: string;
  status: 'ready' | 'not_authenticated' | 'missing_credentials' | 'error';
  message: string;
  suggestion?: string;
  credentialSource?: string;
}

export interface LLMProviderStatus {
  name: string;
  status: 'available' | 'missing' | 'error';
  message: string;
}

export interface DoctorReport {
  services: ServiceStatus[];
  llmProviders: LLMProviderStatus[];
  credentialSources: Record<string, string>;
}

// ============================================================
// Service Checks
// ============================================================

/**
 * Check Exa service status
 */
async function checkExa(): Promise<ServiceStatus> {
  // Exa works via MCP without any auth
  const hasApiKey = Boolean(process.env.EXA_API_KEY);

  return {
    name: 'exa',
    status: 'ready',
    message: hasApiKey ? 'Ready (API key)' : 'Ready (MCP - no auth needed)',
    credentialSource: hasApiKey ? 'env' : 'none',
  };
}

/**
 * Check GitHub service status
 */
async function checkGh(): Promise<ServiceStatus> {
  try {
    const { spawn } = await import('node:child_process');

    return new Promise((resolve) => {
      const child = spawn('gh', ['auth', 'status'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => { stdout += data; });
      child.stderr?.on('data', (data) => { stderr += data; });

      child.on('close', (code) => {
        if (code === 0) {
          // Extract username from output
          const userMatch = (stdout + stderr).match(/Logged in to .+ as (\S+)/);
          const username = userMatch ? userMatch[1] : 'authenticated';

          resolve({
            name: 'gh',
            status: 'ready',
            message: `Ready (gh CLI → ${username})`,
            credentialSource: 'gh CLI',
          });
        } else {
          resolve({
            name: 'gh',
            status: 'not_authenticated',
            message: 'Not authenticated',
            suggestion: 'Run: gh auth login',
            credentialSource: 'gh CLI',
          });
        }
      });

      child.on('error', () => {
        resolve({
          name: 'gh',
          status: 'missing_credentials',
          message: 'gh CLI not installed',
          suggestion: 'Install: brew install gh',
        });
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        child.kill();
        resolve({
          name: 'gh',
          status: 'error',
          message: 'Timeout checking gh CLI',
        });
      }, 5000);
    });
  } catch {
    return {
      name: 'gh',
      status: 'error',
      message: 'Failed to check gh CLI',
    };
  }
}

/**
 * Check Google Calendar service status
 */
async function checkGcal(): Promise<ServiceStatus> {
  const creds = getGoogleCredentials();

  if (!creds.clientId || !creds.clientSecret) {
    return {
      name: 'gcal',
      status: 'missing_credentials',
      message: 'Missing credentials',
      suggestion: 'Run: uni setup gcal',
    };
  }

  const authenticated = hasToken('gcal') || hasToken('google');

  if (authenticated) {
    return {
      name: 'gcal',
      status: 'ready',
      message: `Ready (using: ${creds.source.name})`,
      credentialSource: creds.source.name,
    };
  }

  return {
    name: 'gcal',
    status: 'not_authenticated',
    message: 'Not authenticated',
    suggestion: 'Run: uni gcal auth',
    credentialSource: creds.source.name,
  };
}

/**
 * Check Gmail service status
 */
async function checkGmail(): Promise<ServiceStatus> {
  const creds = getGoogleCredentials();

  if (!creds.clientId || !creds.clientSecret) {
    return {
      name: 'gmail',
      status: 'missing_credentials',
      message: 'Missing credentials',
      suggestion: 'Run: uni setup google',
    };
  }

  const authenticated = hasToken('gmail') || hasToken('google');

  if (authenticated) {
    return {
      name: 'gmail',
      status: 'ready',
      message: `Ready (using: ${creds.source.name})`,
      credentialSource: creds.source.name,
    };
  }

  return {
    name: 'gmail',
    status: 'not_authenticated',
    message: 'Not authenticated',
    suggestion: 'Run: uni gmail auth',
    credentialSource: creds.source.name,
  };
}

/**
 * Check Google Drive service status
 */
async function checkGdrive(): Promise<ServiceStatus> {
  const creds = getGoogleCredentials();

  if (!creds.clientId || !creds.clientSecret) {
    return {
      name: 'gdrive',
      status: 'missing_credentials',
      message: 'Missing credentials',
      suggestion: 'Run: uni setup google',
    };
  }

  const authenticated = hasToken('gdrive') || hasToken('google');

  if (authenticated) {
    return {
      name: 'gdrive',
      status: 'ready',
      message: `Ready (using: ${creds.source.name})`,
      credentialSource: creds.source.name,
    };
  }

  return {
    name: 'gdrive',
    status: 'not_authenticated',
    message: 'Not authenticated',
    suggestion: 'Run: uni gdrive auth',
    credentialSource: creds.source.name,
  };
}

/**
 * Check Slack service status
 */
async function checkSlack(): Promise<ServiceStatus> {
  const creds = getSlackCredentials();

  if (creds.botToken) {
    return {
      name: 'slack',
      status: 'ready',
      message: `Ready (using: ${creds.source.name})`,
      credentialSource: creds.source.name,
    };
  }

  if (creds.clientId && creds.clientSecret) {
    const authenticated = hasToken('slack');
    if (authenticated) {
      return {
        name: 'slack',
        status: 'ready',
        message: `Ready (using: ${creds.source.name})`,
        credentialSource: creds.source.name,
      };
    }

    return {
      name: 'slack',
      status: 'not_authenticated',
      message: 'Not authenticated',
      suggestion: 'Run: uni slack auth',
      credentialSource: creds.source.name,
    };
  }

  return {
    name: 'slack',
    status: 'missing_credentials',
    message: 'Missing credentials',
    suggestion: 'Run: uni setup slack',
  };
}

/**
 * Check Notion service status
 */
async function checkNotion(): Promise<ServiceStatus> {
  const creds = getNotionCredentials();

  if (creds.token) {
    return {
      name: 'notion',
      status: 'ready',
      message: `Ready (using: ${creds.source.name})`,
      credentialSource: creds.source.name,
    };
  }

  if (creds.clientId && creds.clientSecret) {
    const authenticated = hasToken('notion');
    if (authenticated) {
      return {
        name: 'notion',
        status: 'ready',
        message: `Ready (using: ${creds.source.name})`,
        credentialSource: creds.source.name,
      };
    }

    return {
      name: 'notion',
      status: 'not_authenticated',
      message: 'Not authenticated',
      suggestion: 'Run: uni notion auth',
      credentialSource: creds.source.name,
    };
  }

  return {
    name: 'notion',
    status: 'missing_credentials',
    message: 'Missing credentials',
    suggestion: 'Run: uni setup notion',
  };
}

// ============================================================
// LLM Provider Checks
// ============================================================

/**
 * Check a provider by ID
 */
async function checkProvider(providerId: LLMProvider): Promise<LLMProviderStatus> {
  const info = PROVIDERS[providerId];

  if (!info) {
    return {
      name: providerId,
      status: 'missing',
      message: 'Unknown provider',
    };
  }

  // Local providers (no API key needed)
  if (!info.requiresApiKey) {
    if (providerId === 'ollama') {
      try {
        const askConfig = config.getAsk();
        const ollamaUrl = askConfig.ollamaUrl || 'http://localhost:11434';

        const response = await fetch(`${ollamaUrl}/api/tags`, {
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          return {
            name: providerId,
            status: 'available',
            message: `Available (${ollamaUrl})`,
          };
        }
      } catch {
        // Not available
      }

      return {
        name: providerId,
        status: 'missing',
        message: 'Not running',
      };
    }

    // Other local providers - just check base URL is configured
    return {
      name: providerId,
      status: 'available',
      message: `Available (${info.baseUrl})`,
    };
  }

  // Cloud providers - check for API key
  if (info.apiKeyEnv && process.env[info.apiKeyEnv]) {
    return {
      name: providerId,
      status: 'available',
      message: `Available (${info.apiKeyEnv})`,
    };
  }

  const envHint = info.apiKeyEnv ? `Missing ${info.apiKeyEnv}` : 'Not configured';
  return {
    name: providerId,
    status: 'missing',
    message: envHint,
  };
}

/**
 * Get all LLM providers to check
 */
function getLLMProvidersToCheck(): LLMProvider[] {
  return [
    // Tier 1: Major Providers
    'anthropic',
    'openai',
    'google',
    'deepseek',
    'xai',
    // Tier 2: Chinese Providers
    'zhipu',
    'moonshot',
    'minimax',
    'qwen',
    // Tier 3: Aggregators
    'openrouter',
    'groq',
    'together',
    'cerebras',
    // Tier 4: Local
    'ollama',
    'lmstudio',
  ];
}

// ============================================================
// Main Doctor Function
// ============================================================

/**
 * Run full health check
 */
export async function runDoctor(): Promise<DoctorReport> {
  // Check all services in parallel
  const [exa, gh, gcal, gmail, gdrive, slack, notion] = await Promise.all([
    checkExa(),
    checkGh(),
    checkGcal(),
    checkGmail(),
    checkGdrive(),
    checkSlack(),
    checkNotion(),
  ]);

  const services = [exa, gh, gcal, gmail, gdrive, slack, notion];

  // Check all LLM providers in parallel
  const providersToCheck = getLLMProvidersToCheck();
  const llmProviders = await Promise.all(
    providersToCheck.map(providerId => checkProvider(providerId))
  );

  // Credential sources
  const googleCreds = getGoogleCredentials();
  const slackCreds = getSlackCredentials();
  const notionCreds = getNotionCredentials();

  const credentialSources: Record<string, string> = {
    google: googleCreds.source.name || 'not configured',
    slack: slackCreds.source.name || 'not configured',
    notion: notionCreds.source.name || 'not configured',
  };

  return {
    services,
    llmProviders,
    credentialSources,
  };
}

/**
 * Print doctor report to console
 */
export function printDoctorReport(report: DoctorReport): void {
  const line = '═'.repeat(46);

  console.log(`\n${c.bold(line)}`);
  console.log(c.bold(' uni CLI Health Check'));
  console.log(`${c.bold(line)}\n`);

  // Services
  console.log(c.bold(' Services:'));

  for (const svc of report.services) {
    const icon = svc.status === 'ready' ? c.green('✓') : c.red('✗');
    const name = svc.name.padEnd(10);
    const message = svc.status === 'ready' ? c.green(svc.message) : c.yellow(svc.message);

    console.log(`   ${icon} ${c.cyan(name)} ${message}`);

    if (svc.suggestion) {
      console.log(`               ${c.dim(svc.suggestion)}`);
    }
  }

  // LLM Providers
  console.log(`\n${c.bold(' LLM Providers (for uni ask):')}`);

  for (const provider of report.llmProviders) {
    const icon = provider.status === 'available' ? c.green('✓') : c.red('✗');
    const name = provider.name.padEnd(10);
    const message = provider.status === 'available'
      ? c.green(provider.message)
      : c.dim(provider.message);

    console.log(`   ${icon} ${c.cyan(name)} ${message}`);
  }

  // Credential Sources
  console.log(`\n${c.bold(' Credential Source:')}`);

  for (const [service, source] of Object.entries(report.credentialSources)) {
    const name = service.padEnd(8);
    console.log(`   ${c.cyan(name)} ${source}`);
  }

  // Suggestion
  const needsSetup = report.services.some(
    s => s.status === 'missing_credentials' || s.status === 'not_authenticated'
  );

  if (needsSetup) {
    console.log(`\n ${c.dim('Run:')} ${c.cyan('uni setup')}`);
  }

  console.log('');
}
