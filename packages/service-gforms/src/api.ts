/**
 * Google Forms API Client
 *
 * Handles OAuth authentication and Forms API calls.
 * Tokens are stored in ~/.uni/tokens/gforms.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

const SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/drive',
];
const TOKEN_PATH = path.join(process.env.HOME || '~', '.uni/tokens/gforms.json');
const FORMS_API = 'https://forms.googleapis.com/v1';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface Form {
  formId: string;
  info: {
    title: string;
    description?: string;
    documentTitle?: string;
  };
  settings?: {
    quizSettings?: {
      isQuiz: boolean;
    };
  };
  items?: FormItem[];
  responderUri?: string;
  linkedSheetId?: string;
}

export interface FormItem {
  itemId: string;
  title?: string;
  description?: string;
  questionItem?: {
    question: {
      questionId: string;
      required?: boolean;
      textQuestion?: { paragraph?: boolean };
      scaleQuestion?: { low: number; high: number; lowLabel?: string; highLabel?: string };
      choiceQuestion?: { type: string; options: { value: string }[] };
      dateQuestion?: object;
      timeQuestion?: object;
    };
  };
  pageBreakItem?: object;
  textItem?: { title?: string };
}

export interface FormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  answers?: Record<string, {
    questionId: string;
    textAnswers?: { answers: { value: string }[] };
    scaleAnswers?: { answers: { value: number }[] };
  }>;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

export class GoogleFormsClient {
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
      throw new Error('Not authenticated. Run "uni gforms auth" first.');
    }

    if (this.tokens.expires_at && Date.now() > this.tokens.expires_at - 300000) {
      await this.refreshToken();
    }

    return this.tokens.access_token;
  }

  private async refreshToken(): Promise<void> {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token. Run "uni gforms auth" to re-authenticate.');
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
      throw new Error('Failed to refresh token. Run "uni gforms auth" to re-authenticate.');
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
      const port = 8089;
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
              res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>');
              server.close();
              resolve();
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end(`<h1>Authentication failed</h1><p>${err}</p>`);
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

        const cmd =
          process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        Bun.spawn([cmd, authUrl], { stdout: 'ignore', stderr: 'ignore' });
      });

      setTimeout(() => {
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

  private async request<T>(baseUrl: string, endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${baseUrl}${endpoint}`, {
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
   * List recent forms from Drive
   */
  async listForms(limit = 10): Promise<DriveFile[]> {
    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.form'",
      orderBy: 'modifiedTime desc',
      pageSize: String(limit),
      fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    });

    const response = await this.request<{ files: DriveFile[] }>(DRIVE_API, `/files?${params}`);
    return response.files || [];
  }

  /**
   * Get form details
   */
  async getForm(formId: string): Promise<Form> {
    return this.request<Form>(FORMS_API, `/forms/${formId}`);
  }

  /**
   * Create a new form
   */
  async createForm(title: string): Promise<Form> {
    return this.request<Form>(FORMS_API, '/forms', {
      method: 'POST',
      body: JSON.stringify({
        info: { title },
      }),
    });
  }

  /**
   * Add a question to a form
   */
  async addQuestion(
    formId: string,
    title: string,
    questionType: 'text' | 'paragraph' | 'scale' | 'choice',
    options?: { choices?: string[]; low?: number; high?: number; required?: boolean }
  ): Promise<void> {
    let question: object;

    switch (questionType) {
      case 'text':
        question = { textQuestion: {} };
        break;
      case 'paragraph':
        question = { textQuestion: { paragraph: true } };
        break;
      case 'scale':
        question = {
          scaleQuestion: {
            low: options?.low ?? 1,
            high: options?.high ?? 5,
          },
        };
        break;
      case 'choice':
        question = {
          choiceQuestion: {
            type: 'RADIO',
            options: (options?.choices || ['Option 1', 'Option 2']).map(v => ({ value: v })),
          },
        };
        break;
      default:
        question = { textQuestion: {} };
    }

    const request = {
      requests: [
        {
          createItem: {
            item: {
              title,
              questionItem: {
                question: {
                  required: options?.required ?? false,
                  ...question,
                },
              },
            },
            location: { index: 0 },
          },
        },
      ],
    };

    await this.request(FORMS_API, `/forms/${formId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get form responses
   */
  async getResponses(formId: string): Promise<FormResponse[]> {
    const response = await this.request<{ responses?: FormResponse[] }>(
      FORMS_API,
      `/forms/${formId}/responses`
    );
    return response.responses || [];
  }

  /**
   * Delete a form
   */
  async deleteForm(formId: string): Promise<void> {
    await this.request(DRIVE_API, `/files/${formId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Share form with email
   */
  async shareForm(formId: string, email: string, role: 'reader' | 'writer' = 'writer'): Promise<void> {
    await this.request(DRIVE_API, `/files/${formId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'user',
        role,
        emailAddress: email,
      }),
    });
  }
}

// Singleton instance
export const gforms = new GoogleFormsClient();

/**
 * Extract form ID from URL or return as-is
 */
export function extractFormId(input: string): string {
  // Handle full URL: https://docs.google.com/forms/d/FORM_ID/edit
  const urlMatch = input.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  // Also handle /e/ URLs (published forms)
  const eMatch = input.match(/\/forms\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (eMatch) {
    return eMatch[1];
  }
  return input;
}
