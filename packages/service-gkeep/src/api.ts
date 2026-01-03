/**
 * Google Keep API Client
 *
 * Handles OAuth authentication and Keep API calls.
 * Tokens are stored in ~/.uni/tokens/gkeep.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

const SCOPES = ['https://www.googleapis.com/auth/keep'];
const TOKEN_PATH = path.join(process.env.HOME || '~', '.uni/tokens/gkeep.json');
const KEEP_API = 'https://keep.googleapis.com/v1';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface Note {
  name: string;
  title?: string;
  body?: {
    text?: { text: string };
    list?: { listItems: ListItem[] };
  };
  createTime: string;
  updateTime: string;
  trashed?: boolean;
  archived?: boolean;
  pinned?: boolean;
  attachments?: Attachment[];
}

interface ListItem {
  text: { text: string };
  checked?: boolean;
  childListItems?: ListItem[];
}

interface Attachment {
  name: string;
  mimeType: string[];
}

export class GoogleKeepClient {
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

  async getAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Not authenticated. Run "uni gkeep auth" first.');
    }

    if (this.tokens.expires_at && Date.now() > this.tokens.expires_at - 300000) {
      await this.refreshToken();
    }

    return this.tokens.access_token;
  }

  private async refreshToken(): Promise<void> {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token. Run "uni gkeep auth" to re-authenticate.');
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
      throw new Error('Failed to refresh token. Run "uni gkeep auth" to re-authenticate.');
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

  async authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      const port = 8090;
      const redirectUri = `http://localhost:${port}/callback`;
      let timeoutId: ReturnType<typeof setTimeout>;

      const cleanup = () => { clearTimeout(timeoutId); server.close(); };

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
              res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>');
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

        const cmd =
          process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        Bun.spawn([cmd, authUrl], { stdout: 'ignore', stderr: 'ignore' });
      });

      timeoutId = setTimeout(() => {
        server.close();
        reject(new Error('Authentication timed out'));
      }, 120000);
    });
  }

  logout(): void {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
    this.tokens = null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${KEEP_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  /**
   * List notes
   */
  async listNotes(filter?: { trashed?: boolean; archived?: boolean }): Promise<Note[]> {
    let endpoint = '/notes';
    const params: string[] = [];

    if (filter?.trashed !== undefined) {
      params.push(`filter=trashed=${filter.trashed}`);
    }

    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    const response = await this.request<{ notes?: Note[] }>(endpoint);
    let notes = response.notes || [];

    // Filter archived if needed (API doesn't have direct filter)
    if (filter?.archived !== undefined) {
      notes = notes.filter(n => n.archived === filter.archived);
    }

    return notes;
  }

  /**
   * Get a specific note
   */
  async getNote(noteId: string): Promise<Note> {
    const name = noteId.startsWith('notes/') ? noteId : `notes/${noteId}`;
    return this.request<Note>(`/${name}`);
  }

  /**
   * Create a new note
   */
  async createNote(title: string, content: string): Promise<Note> {
    return this.request<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({
        title,
        body: {
          text: { text: content },
        },
      }),
    });
  }

  /**
   * Create a list note
   */
  async createListNote(title: string, items: string[]): Promise<Note> {
    return this.request<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({
        title,
        body: {
          list: {
            listItems: items.map(text => ({
              text: { text },
              checked: false,
            })),
          },
        },
      }),
    });
  }

  /**
   * Delete a note (moves to trash)
   */
  async deleteNote(noteId: string): Promise<void> {
    const name = noteId.startsWith('notes/') ? noteId : `notes/${noteId}`;
    await this.request(`/${name}`, {
      method: 'DELETE',
    });
  }

  /**
   * Extract text content from a note
   */
  extractContent(note: Note): string {
    if (note.body?.text?.text) {
      return note.body.text.text;
    }

    if (note.body?.list?.listItems) {
      return note.body.list.listItems
        .map(item => {
          const checkbox = item.checked ? '[x]' : '[ ]';
          return `${checkbox} ${item.text.text}`;
        })
        .join('\n');
    }

    return '';
  }

  /**
   * Extract note ID from full name
   */
  extractNoteId(name: string): string {
    return name.replace('notes/', '');
  }
}

// Singleton instance
export const gkeep = new GoogleKeepClient();
