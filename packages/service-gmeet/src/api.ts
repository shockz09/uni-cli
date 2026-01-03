/**
 * Google Meet API Client (uses Calendar API)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

// Uses same token as gcal - Calendar API
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];
const TOKEN_PATH = path.join(process.env.HOME || '~', '.uni/tokens/gmeet.json');
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface MeetEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
    conferenceSolution?: {
      name: string;
      iconUri: string;
    };
  };
  attendees?: Array<{ email: string; responseStatus?: string }>;
  htmlLink?: string;
}

interface EventsResponse {
  items?: MeetEvent[];
  nextPageToken?: string;
}

export class GMeetClient {
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
    if (!this.tokens) throw new Error('Not authenticated. Run "uni gmeet auth".');
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
      const port = 8090;
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
              res.end('<h1>Google Meet authenticated!</h1>');
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
    const response = await fetch(`${CALENDAR_API}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Calendar API error: ${response.status} - ${error}`);
    }
    return response.json() as Promise<T>;
  }

  /**
   * Create an instant meeting (starts now)
   */
  async createInstantMeeting(title: string = 'Quick Meeting', durationMinutes: number = 30): Promise<MeetEvent> {
    const now = new Date();
    const end = new Date(now.getTime() + durationMinutes * 60 * 1000);

    return this.request<MeetEvent>('/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      body: JSON.stringify({
        summary: title,
        start: { dateTime: now.toISOString() },
        end: { dateTime: end.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    });
  }

  /**
   * Schedule a meeting for later
   */
  async scheduleMeeting(options: {
    title: string;
    date: Date;
    durationMinutes: number;
    attendees?: string[];
  }): Promise<MeetEvent> {
    const end = new Date(options.date.getTime() + options.durationMinutes * 60 * 1000);

    const eventData: Record<string, unknown> = {
      summary: options.title,
      start: { dateTime: options.date.toISOString() },
      end: { dateTime: end.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    if (options.attendees && options.attendees.length > 0) {
      eventData.attendees = options.attendees.map(email => ({ email }));
    }

    return this.request<MeetEvent>('/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  /**
   * List upcoming events with Meet links
   */
  async listMeetings(days: number = 7): Promise<MeetEvent[]> {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '50',
    });

    const response = await this.request<EventsResponse>(`/calendars/primary/events?${params}`);
    const events = response.items || [];

    // Filter to only events with Meet links
    return events.filter(e => e.hangoutLink || e.conferenceData?.entryPoints?.some(ep => ep.entryPointType === 'video'));
  }

  /**
   * Get the Meet link from an event
   */
  getMeetLink(event: MeetEvent): string | undefined {
    if (event.hangoutLink) return event.hangoutLink;
    const videoEntry = event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video');
    return videoEntry?.uri;
  }

  /**
   * Delete/cancel a meeting
   */
  async deleteMeeting(eventId: string): Promise<void> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `${CALENDAR_API}/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete meeting: ${response.status}`);
    }
  }
}

export const gmeet = new GMeetClient();
