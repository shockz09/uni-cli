/**
 * Google OAuth Client Base Class
 *
 * Shared authentication logic for all Google services.
 * Each service extends this class and provides its own scopes and API base URL.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

const OAUTH_PORT = 8085;
const TOKEN_DIR = path.join(process.env.HOME || '~', '.uni/tokens');

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface GoogleAuthConfig {
  /** Service name used for token file (e.g., 'gcal' -> ~/.uni/tokens/gcal.json) */
  serviceName: string;
  /** OAuth scopes required by this service */
  scopes: string[];
  /** Base URL for API requests (e.g., 'https://www.googleapis.com/calendar/v3') */
  apiBase: string;
}

export abstract class GoogleAuthClient {
  protected config: GoogleAuthConfig;
  protected tokens: TokenData | null = null;
  private clientId: string;
  private clientSecret: string;

  constructor(config: GoogleAuthConfig) {
    this.config = config;
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.loadTokens();
  }

  /**
   * Get the token file path for this service
   */
  private get tokenPath(): string {
    return path.join(TOKEN_DIR, `${this.config.serviceName}.json`);
  }

  /**
   * Check if credentials are configured
   */
  hasCredentials(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Check if we have valid tokens
   */
  isAuthenticated(): boolean {
    return Boolean(this.tokens?.access_token);
  }

  /**
   * Load tokens from disk
   */
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

  /**
   * Save tokens to disk
   */
  protected saveTokens(tokens: TokenData): void {
    if (!fs.existsSync(TOKEN_DIR)) {
      fs.mkdirSync(TOKEN_DIR, { recursive: true });
    }
    fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));
    this.tokens = tokens;
  }

  /**
   * Get a valid access token, refreshing if needed
   * Public so subclasses can use for custom requests (upload, download, etc.)
   */
  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error(`Not authenticated. Run "uni ${this.config.serviceName} auth" first.`);
    }

    // Check if token is expired (with 5 min buffer)
    if (this.tokens.expires_at && Date.now() > this.tokens.expires_at - 300000) {
      await this.refreshToken();
    }

    return this.tokens.access_token;
  }

  /**
   * Refresh the access token
   */
  protected async refreshToken(): Promise<void> {
    if (!this.tokens?.refresh_token) {
      throw new Error(`No refresh token. Run "uni ${this.config.serviceName} auth" to re-authenticate.`);
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token. Run "uni ${this.config.serviceName} auth" to re-authenticate.`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.saveTokens({
      ...this.tokens,
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    });
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string, redirectUri: string): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OAuth failed: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    this.saveTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    });
  }

  /**
   * Run local OAuth flow with temporary server
   */
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
              res.end(`<h1>${this.config.serviceName} authenticated!</h1><p>You can close this window.</p>`);
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

  /**
   * Logout - remove stored tokens
   */
  logout(): void {
    if (fs.existsSync(this.tokenPath)) {
      fs.unlinkSync(this.tokenPath);
    }
    this.tokens = null;
  }

  /**
   * Make authenticated API request
   */
  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.config.apiBase}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${this.config.serviceName} API error: ${response.status} - ${error}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}
