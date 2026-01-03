/**
 * Google Slides API Client
 *
 * Handles OAuth authentication and Slides API calls.
 * Tokens are stored in ~/.uni/tokens/gslides.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

const SCOPES = [
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/drive',
];
const TOKEN_PATH = path.join(process.env.HOME || '~', '.uni/tokens/gslides.json');
const SLIDES_API = 'https://slides.googleapis.com/v1';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface Presentation {
  presentationId: string;
  title: string;
  slides?: Slide[];
  pageSize?: {
    width: { magnitude: number; unit: string };
    height: { magnitude: number; unit: string };
  };
}

export interface Slide {
  objectId: string;
  pageElements?: PageElement[];
}

interface PageElement {
  objectId: string;
  size?: object;
  transform?: object;
  shape?: {
    shapeType: string;
    text?: {
      textElements: TextElement[];
    };
  };
}

interface TextElement {
  startIndex?: number;
  endIndex?: number;
  textRun?: {
    content: string;
    style?: object;
  };
  paragraphMarker?: object;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

export class GoogleSlidesClient {
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
      throw new Error('Not authenticated. Run "uni gslides auth" first.');
    }

    if (this.tokens.expires_at && Date.now() > this.tokens.expires_at - 300000) {
      await this.refreshToken();
    }

    return this.tokens.access_token;
  }

  private async refreshToken(): Promise<void> {
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token. Run "uni gslides auth" to re-authenticate.');
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
      throw new Error('Failed to refresh token. Run "uni gslides auth" to re-authenticate.');
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
      const port = 8088;
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
   * List recent presentations from Drive
   */
  async listPresentations(limit = 10): Promise<DriveFile[]> {
    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.presentation'",
      orderBy: 'modifiedTime desc',
      pageSize: String(limit),
      fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    });

    const response = await this.request<{ files: DriveFile[] }>(DRIVE_API, `/files?${params}`);
    return response.files || [];
  }

  /**
   * Get presentation metadata and slides
   */
  async getPresentation(presentationId: string): Promise<Presentation> {
    return this.request<Presentation>(SLIDES_API, `/presentations/${presentationId}`);
  }

  /**
   * Create a new presentation
   */
  async createPresentation(title: string): Promise<Presentation> {
    return this.request<Presentation>(SLIDES_API, '/presentations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  /**
   * Add a new slide
   */
  async addSlide(presentationId: string, layoutId?: string): Promise<string> {
    const requests: object[] = [
      {
        createSlide: {
          insertionIndex: undefined, // Append at end
          slideLayoutReference: layoutId ? { layoutId } : undefined,
        },
      },
    ];

    const response = await this.request<{ replies: Array<{ createSlide?: { objectId: string } }> }>(
      SLIDES_API,
      `/presentations/${presentationId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );

    return response.replies?.[0]?.createSlide?.objectId || '';
  }

  /**
   * Add text to a slide
   */
  async addText(presentationId: string, slideId: string, text: string): Promise<void> {
    // First create a text box
    const shapeId = `textbox_${Date.now()}`;

    const requests = [
      {
        createShape: {
          objectId: shapeId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 500, unit: 'PT' },
              height: { magnitude: 300, unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 50,
              translateY: 100,
              unit: 'PT',
            },
          },
        },
      },
      {
        insertText: {
          objectId: shapeId,
          text: text,
          insertionIndex: 0,
        },
      },
    ];

    await this.request(SLIDES_API, `/presentations/${presentationId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }

  /**
   * Share presentation with email
   */
  async sharePresentation(
    presentationId: string,
    email: string,
    role: 'reader' | 'writer' = 'writer'
  ): Promise<void> {
    await this.request(DRIVE_API, `/files/${presentationId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'user',
        role,
        emailAddress: email,
      }),
    });
  }

  /**
   * Export presentation to different format
   */
  async exportPresentation(presentationId: string, mimeType: string): Promise<ArrayBuffer> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${DRIVE_API}/files/${presentationId}/export?mimeType=${encodeURIComponent(mimeType)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Delete a presentation
   */
  async deletePresentation(presentationId: string): Promise<void> {
    await this.request(DRIVE_API, `/files/${presentationId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Extract text from slides
   */
  extractSlideText(presentation: Presentation): string[] {
    if (!presentation.slides) return [];

    return presentation.slides.map((slide, index) => {
      let text = `Slide ${index + 1}:\n`;

      if (slide.pageElements) {
        for (const element of slide.pageElements) {
          if (element.shape?.text?.textElements) {
            for (const textEl of element.shape.text.textElements) {
              if (textEl.textRun?.content) {
                text += textEl.textRun.content;
              }
            }
          }
        }
      }

      return text.trim();
    });
  }
}

// Singleton instance
export const gslides = new GoogleSlidesClient();

/**
 * Extract presentation ID from URL or return as-is
 */
export function extractPresentationId(input: string): string {
  // Handle full URL: https://docs.google.com/presentation/d/PRESENTATION_ID/edit
  const urlMatch = input.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  return input;
}
