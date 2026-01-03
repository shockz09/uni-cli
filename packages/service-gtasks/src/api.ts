/**
 * Google Tasks API Client
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

const SCOPES = ['https://www.googleapis.com/auth/tasks'];
const TOKEN_PATH = path.join(process.env.HOME || '~', '.uni/tokens/gtasks.json');
const TASKS_API = 'https://tasks.googleapis.com/tasks/v1';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface TaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
  parent?: string;
  position?: string;
}

interface TaskListResponse {
  items?: TaskList[];
  nextPageToken?: string;
}

interface TaskResponse {
  items?: Task[];
  nextPageToken?: string;
}

export class GTasksClient {
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
        this.tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      }
    } catch {
      this.tokens = null;
    }
  }

  private saveTokens(tokens: TokenData): void {
    const dir = path.dirname(TOKEN_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    this.tokens = tokens;
  }

  clearTokens(): void {
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
    this.tokens = null;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.tokens) throw new Error('Not authenticated. Run "uni gtasks auth".');
    if (this.tokens.expires_at && Date.now() > this.tokens.expires_at - 300000) {
      await this.refreshToken();
    }
    return this.tokens.access_token;
  }

  private async refreshToken(): Promise<void> {
    if (!this.tokens?.refresh_token) throw new Error('No refresh token.');

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

    if (!response.ok) throw new Error('Failed to refresh token.');

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.saveTokens({
      ...this.tokens,
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    });
  }

  async authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
      const port = 8088;
      const redirectUri = `http://localhost:${port}/callback`;
      let timeoutId: ReturnType<typeof setTimeout>;

      const cleanup = () => { clearTimeout(timeoutId); server.close(); };

      const server = http.createServer(async (req, res) => {
        const url = new URL(req.url || '', `http://localhost:${port}`);
        if (url.pathname === '/callback') {
          const code = url.searchParams.get('code');
          if (code) {
            try {
              await this.exchangeCode(code, redirectUri);
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end('<h1>Google Tasks authenticated!</h1>');
              cleanup();
              resolve();
            } catch (err) {
              res.writeHead(500);
              res.end('Failed');
              cleanup();
              reject(err);
            }
            return;
          }
        }
        res.writeHead(404);
        res.end();
      });

      server.listen(port, () => {
        const params = new URLSearchParams({
          client_id: this.clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: SCOPES.join(' '),
          access_type: 'offline',
          prompt: 'consent',
        });
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
        console.log(`\nOpen: \x1b[36m${authUrl}\x1b[0m\n`);
        Bun.spawn([process.platform === 'darwin' ? 'open' : 'xdg-open', authUrl], { stdout: 'ignore' });
      });

      timeoutId = setTimeout(() => { server.close(); reject(new Error('Timeout')); }, 120000);
    });
  }

  private async exchangeCode(code: string, redirectUri: string): Promise<void> {
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(`${TASKS_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tasks API error: ${response.status} - ${error}`);
    }
    if (response.status === 204) return {} as T;
    return response.json() as Promise<T>;
  }

  // Task Lists
  async getTaskLists(): Promise<TaskList[]> {
    const response = await this.request<TaskListResponse>('/users/@me/lists');
    return response.items || [];
  }

  async createTaskList(title: string): Promise<TaskList> {
    return this.request<TaskList>('/users/@me/lists', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async deleteTaskList(listId: string): Promise<void> {
    await this.request(`/users/@me/lists/${listId}`, { method: 'DELETE' });
  }

  // Tasks
  async getTasks(listId: string = '@default', options: { showCompleted?: boolean; maxResults?: number } = {}): Promise<Task[]> {
    const params = new URLSearchParams({
      maxResults: String(options.maxResults || 100),
      showCompleted: String(options.showCompleted || false),
    });
    const response = await this.request<TaskResponse>(`/lists/${listId}/tasks?${params}`);
    return response.items || [];
  }

  async createTask(listId: string = '@default', task: { title: string; notes?: string; due?: string }): Promise<Task> {
    return this.request<Task>(`/lists/${listId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(listId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/lists/${listId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async completeTask(listId: string, taskId: string): Promise<Task> {
    return this.updateTask(listId, taskId, { status: 'completed' });
  }

  async deleteTask(listId: string, taskId: string): Promise<void> {
    await this.request(`/lists/${listId}/tasks/${taskId}`, { method: 'DELETE' });
  }

  async findTaskByTitle(listId: string, title: string): Promise<Task | null> {
    const tasks = await this.getTasks(listId, { showCompleted: true });
    return tasks.find(t => t.title.toLowerCase().includes(title.toLowerCase())) || null;
  }
}

export const gtasks = new GTasksClient();
