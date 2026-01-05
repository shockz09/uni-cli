/**
 * Generic OAuth Client for third-party services
 *
 * Shared authentication logic for Linear, Todoist, Trello, etc.
 * Each service provides its own config (URLs, scopes, credentials).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

const OAUTH_PORT = 9876;
const TOKEN_DIR = path.join(process.env.HOME || '~', '.uni/tokens');

export interface OAuthTokenData {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface OAuthProviderConfig {
  /** Provider name (e.g., 'linear', 'todoist', 'trello') */
  name: string;
  /** OAuth authorization URL */
  authUrl: string;
  /** OAuth token exchange URL */
  tokenUrl: string;
  /** OAuth scopes */
  scopes: string[];
  /** Default client ID (embedded) */
  defaultClientId: string;
  /** Default client secret (embedded) */
  defaultClientSecret: string;
  /** Environment variable names for custom credentials */
  envClientId?: string;
  envClientSecret?: string;
  /** Whether this provider supports refresh tokens */
  supportsRefresh?: boolean;
  /** Custom auth URL params */
  authParams?: Record<string, string>;
  /** Custom token request params */
  tokenParams?: Record<string, string>;
}

export class OAuthClient {
  protected config: OAuthProviderConfig;
  protected tokens: OAuthTokenData | null = null;
  private clientId: string;
  private clientSecret: string;

  constructor(config: OAuthProviderConfig) {
    this.config = config;
    // Use env vars if set, otherwise use defaults
    this.clientId = (config.envClientId ? process.env[config.envClientId] : null) || config.defaultClientId;
    this.clientSecret = (config.envClientSecret ? process.env[config.envClientSecret] : null) || config.defaultClientSecret;
    this.loadTokens();
  }

  private get tokenPath(): string {
    return path.join(TOKEN_DIR, `${this.config.name}.json`);
  }

  hasCredentials(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  isAuthenticated(): boolean {
    return Boolean(this.tokens?.access_token);
  }

  getAccessToken(): string | null {
    return this.tokens?.access_token || null;
  }

  protected loadTokens(): void {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const data = fs.readFileSync(this.tokenPath, 'utf-8');
        this.tokens = JSON.parse(data);
      }
    } catch {
      this.tokens = null;
    }
  }

  protected saveTokens(tokens: OAuthTokenData): void {
    if (!fs.existsSync(TOKEN_DIR)) {
      fs.mkdirSync(TOKEN_DIR, { recursive: true });
    }
    fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));
    this.tokens = tokens;
  }

  /**
   * Check if token needs refresh
   */
  async ensureValidToken(): Promise<string> {
    if (!this.tokens?.access_token) {
      throw new Error(`Not authenticated. Run "uni ${this.config.name} auth" first.`);
    }

    // Check if token is expired (with 5 min buffer)
    if (this.config.supportsRefresh && this.tokens.expires_at && Date.now() > this.tokens.expires_at - 300000) {
      await this.refreshToken();
    }

    return this.tokens.access_token;
  }

  protected async refreshToken(): Promise<void> {
    if (!this.tokens?.refresh_token) {
      throw new Error(`No refresh token. Run "uni ${this.config.name} auth" to re-authenticate.`);
    }

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.tokens.refresh_token,
      grant_type: 'refresh_token',
      ...this.config.tokenParams,
    });

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token. Run "uni ${this.config.name} auth" to re-authenticate.`);
    }

    const data = (await response.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
    this.saveTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token || this.tokens.refresh_token,
      expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    });
  }

  getAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      ...this.config.authParams,
    });
    return `${this.config.authUrl}?${params}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<void> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      ...this.config.tokenParams,
    });

    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth failed: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    this.saveTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    });
  }

  async authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      const port = OAUTH_PORT;
      const redirectUri = `http://localhost:${port}/callback`;
      let timeoutId: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        clearTimeout(timeoutId);
        server.close();
      };

      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '', `http://localhost:${port}`);

        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Authentication failed</h1><p>${error}</p>`);
            cleanup();
            reject(new Error(error));
            return;
          }

          if (code) {
            try {
              await this.exchangeCode(code, redirectUri);
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`<h1>${this.config.name} authenticated!</h1><p>You can close this window.</p>`);
              cleanup();
              resolve();
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end(`<h1>Authentication failed</h1><p>${err}</p>`);
              cleanup();
              reject(err);
            }
            return;
          }
        }

        res.writeHead(404);
        res.end('Not found');
      });

      server.listen(port, () => {
        const authUrl = this.getAuthUrl(redirectUri);
        console.log(`\nOpen this URL in your browser:\n\n\x1b[36m${authUrl}\x1b[0m\n`);

        // Try to open browser automatically
        const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        Bun.spawn([cmd, authUrl], { stdout: 'ignore', stderr: 'ignore' });
      });

      // Timeout after 2 minutes
      timeoutId = setTimeout(() => {
        server.close();
        reject(new Error('Authentication timed out'));
      }, 120000);
    });
  }

  logout(): void {
    if (fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath);
    }
    this.tokens = null;
  }
}
