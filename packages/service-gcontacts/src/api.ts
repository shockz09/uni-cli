/**
 * Google Contacts API Client (People API)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

const SCOPES = [
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts',
];
const TOKEN_PATH = path.join(process.env.HOME || '~', '.uni/tokens/gcontacts.json');
const PEOPLE_API = 'https://people.googleapis.com/v1';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface Contact {
  resourceName: string;
  etag?: string;
  names?: Array<{ displayName: string; givenName?: string; familyName?: string }>;
  emailAddresses?: Array<{ value: string; type?: string }>;
  phoneNumbers?: Array<{ value: string; type?: string }>;
  organizations?: Array<{ name?: string; title?: string }>;
  photos?: Array<{ url: string }>;
}

interface ContactsResponse {
  connections?: Contact[];
  nextPageToken?: string;
  totalItems?: number;
}

interface SearchResponse {
  results?: Array<{ person: Contact }>;
}

export class GContactsClient {
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
    if (!this.tokens) throw new Error('Not authenticated. Run "uni gcontacts auth".');
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
      const port = 8089;
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
              res.end('<h1>Google Contacts authenticated!</h1>');
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
    const response = await fetch(`${PEOPLE_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`People API error: ${response.status} - ${error}`);
    }
    if (response.status === 204) return {} as T;
    return response.json() as Promise<T>;
  }

  async listContacts(pageSize: number = 20): Promise<Contact[]> {
    const params = new URLSearchParams({
      pageSize: String(pageSize),
      personFields: 'names,emailAddresses,phoneNumbers,organizations,photos',
    });
    const response = await this.request<ContactsResponse>(`/people/me/connections?${params}`);
    return response.connections || [];
  }

  async searchContacts(query: string): Promise<Contact[]> {
    const params = new URLSearchParams({
      query,
      readMask: 'names,emailAddresses,phoneNumbers,organizations,photos',
    });
    const response = await this.request<SearchResponse>(`/people:searchContacts?${params}`);
    return response.results?.map(r => r.person) || [];
  }

  async getContact(resourceName: string): Promise<Contact> {
    const params = new URLSearchParams({
      personFields: 'names,emailAddresses,phoneNumbers,organizations,photos',
    });
    return this.request<Contact>(`/${resourceName}?${params}`);
  }

  async createContact(contact: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  }): Promise<Contact> {
    const nameParts = contact.name.split(' ');
    const givenName = nameParts[0];
    const familyName = nameParts.slice(1).join(' ') || undefined;

    const body: Record<string, unknown> = {
      names: [{ givenName, familyName }],
    };

    if (contact.email) {
      body.emailAddresses = [{ value: contact.email }];
    }
    if (contact.phone) {
      body.phoneNumbers = [{ value: contact.phone }];
    }
    if (contact.company) {
      body.organizations = [{ name: contact.company }];
    }

    return this.request<Contact>('/people:createContact', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async deleteContact(resourceName: string): Promise<void> {
    await this.request(`/${resourceName}:deleteContact`, { method: 'DELETE' });
  }

  async updateContact(resourceName: string, updates: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
  }): Promise<Contact> {
    // Get current contact first
    const current = await this.getContact(resourceName);

    const body: Record<string, unknown> = {};
    const updateMask: string[] = [];

    if (updates.name) {
      const nameParts = updates.name.split(' ');
      body.names = [{ givenName: nameParts[0], familyName: nameParts.slice(1).join(' ') || undefined }];
      updateMask.push('names');
    }
    if (updates.email) {
      body.emailAddresses = [{ value: updates.email }];
      updateMask.push('emailAddresses');
    }
    if (updates.phone) {
      body.phoneNumbers = [{ value: updates.phone }];
      updateMask.push('phoneNumbers');
    }
    if (updates.company) {
      body.organizations = [{ name: updates.company }];
      updateMask.push('organizations');
    }

    body.etag = current.etag;

    const params = new URLSearchParams({
      updatePersonFields: updateMask.join(','),
    });

    return this.request<Contact>(`/${resourceName}:updateContact?${params}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // Helper to get display info
  getDisplayName(contact: Contact): string {
    return contact.names?.[0]?.displayName || 'Unknown';
  }

  getEmail(contact: Contact): string | undefined {
    return contact.emailAddresses?.[0]?.value;
  }

  getPhone(contact: Contact): string | undefined {
    return contact.phoneNumbers?.[0]?.value;
  }

  getCompany(contact: Contact): string | undefined {
    return contact.organizations?.[0]?.name;
  }
}

export const gcontacts = new GContactsClient();
