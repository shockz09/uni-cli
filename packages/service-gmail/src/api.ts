/**
 * Gmail API Client
 *
 * Reuses Google OAuth from gcal service (same client credentials).
 * Tokens stored in ~/.uni/tokens/gmail.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];
const TOKEN_PATH = path.join(process.env.HOME || '~', '.uni/tokens/gmail.json');
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface Email {
  id: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  payload?: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body?: { data?: string } }>;
  };
  internalDate?: string;
}

interface EmailList {
  messages: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export class GmailClient {
  private clientId: string;
  private clientSecret: string;
  private tokens: TokenData | null = null;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.loadTokens();
  }

  hasCredentials(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  isAuthenticated(): boolean {
    return Boolean(this.tokens?.access_token);
  }

  private loadTokens(): void {
    try {
      if (fs.existsSync(TOKEN_PATH)) {
        const data = fs.readFileSync(TOKEN_PATH, 'utf-8');
        this.tokens = JSON.parse(data);
      }
    } catch {
      this.tokens = null;
    }
  }

  private saveTokens(tokens: TokenData): void {
    const dir = path.dirname(TOKEN_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    this.tokens = tokens;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Not authenticated. Run "uni gmail auth" first.');
    }

    if (this.tokens.expires_at && Date.now() > this.tokens.expires_at - 300000) {
      await this.refreshToken();
    }

    return this.tokens.access_token;
  }

  private async refreshToken(): Promise<void> {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token. Run "uni gmail auth" to re-authenticate.');
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
      throw new Error('Failed to refresh token.');
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.saveTokens({
      ...this.tokens,
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    });
  }

  getAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

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
      throw new Error('OAuth failed');
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

  async authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      const port = 8086;
      const redirectUri = `http://localhost:${port}/callback`;

      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '', `http://localhost:${port}`);

        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Authentication failed</h1><p>${error}</p>`);
            server.close();
            reject(new Error(error));
            return;
          }

          if (code) {
            try {
              await this.exchangeCode(code, redirectUri);
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end('<h1>Gmail authenticated!</h1><p>You can close this window.</p>');
              server.close();
              resolve();
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end(`<h1>Failed</h1><p>${err}</p>`);
              server.close();
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
        const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
        Bun.spawn([cmd, authUrl], { stdout: 'ignore', stderr: 'ignore' });
      });

      setTimeout(() => {
        server.close();
        reject(new Error('Authentication timed out'));
      }, 120000);
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${GMAIL_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gmail API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * List emails
   */
  async listEmails(options: {
    maxResults?: number;
    q?: string;
    labelIds?: string[];
  } = {}): Promise<Array<{ id: string; threadId: string }>> {
    const { maxResults = 20, q, labelIds } = options;

    const params = new URLSearchParams({ maxResults: String(maxResults) });
    if (q) params.set('q', q);
    if (labelIds) params.set('labelIds', labelIds.join(','));

    const response = await this.request<EmailList>(`/users/me/messages?${params}`);
    return response.messages || [];
  }

  /**
   * Get email details
   */
  async getEmail(id: string): Promise<Email> {
    return this.request<Email>(`/users/me/messages/${id}`);
  }

  /**
   * Send email
   */
  async sendEmail(to: string, subject: string, body: string): Promise<{ id: string }> {
    const raw = this.createRawEmail(to, subject, body);

    return this.request<{ id: string }>('/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw }),
    });
  }

  /**
   * Create base64 encoded email
   */
  private createRawEmail(to: string, subject: string, body: string): string {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\r\n');

    return Buffer.from(email).toString('base64url');
  }

  /**
   * Extract email header
   */
  getHeader(email: Email, name: string): string | undefined {
    return email.payload?.headers?.find(
      h => h.name.toLowerCase() === name.toLowerCase()
    )?.value;
  }

  /**
   * Decode email body
   */
  decodeBody(email: Email): string {
    if (email.payload?.body?.data) {
      return Buffer.from(email.payload.body.data, 'base64url').toString('utf-8');
    }

    const textPart = email.payload?.parts?.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
    }

    return email.snippet || '';
  }
}

export const gmail = new GmailClient();
