/**
 * Google Drive API Client
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as http from 'node:http';

const SCOPES = [
  'https://www.googleapis.com/auth/drive',  // Full access for delete
];
const TOKEN_PATH = path.join(process.env.HOME || '~', '.uni/tokens/gdrive.json');
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
  owners?: Array<{ displayName: string; emailAddress: string }>;
}

interface FileList {
  files: DriveFile[];
  nextPageToken?: string;
}

export class GDriveClient {
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

  private async getAccessToken(): Promise<string> {
    if (!this.tokens) throw new Error('Not authenticated. Run "uni gdrive auth".');
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
      const port = 8087;
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
              res.end('<h1>Google Drive authenticated!</h1>');
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

  private async request<T>(endpoint: string): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(`${DRIVE_API}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`Drive API error: ${response.status}`);
    return response.json() as Promise<T>;
  }

  async listFiles(options: { query?: string; pageSize?: number; folderId?: string } = {}): Promise<DriveFile[]> {
    const { query, pageSize = 20, folderId } = options;

    const params = new URLSearchParams({
      pageSize: String(pageSize),
      fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,parents)',
    });

    let q = folderId ? `'${folderId}' in parents` : '';
    if (query) q = q ? `${q} and ${query}` : query;
    if (q) params.set('q', q);

    const response = await this.request<FileList>(`/files?${params}`);
    return response.files || [];
  }

  async getFile(fileId: string): Promise<DriveFile> {
    return this.request<DriveFile>(
      `/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,owners`
    );
  }

  async search(query: string, pageSize = 20): Promise<DriveFile[]> {
    const params = new URLSearchParams({
      q: `name contains '${query}'`,
      pageSize: String(pageSize),
      fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink)',
    });

    const response = await this.request<FileList>(`/files?${params}`);
    return response.files || [];
  }

  getMimeIcon(mimeType: string): string {
    if (mimeType.includes('folder')) return '📁';
    if (mimeType.includes('document')) return '📝';
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('video')) return '🎬';
    return '📄';
  }

  async deleteFile(fileId: string): Promise<void> {
    const token = await this.getAccessToken();
    const response = await fetch(`${DRIVE_API}/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete file: ${response.status}`);
    }
  }

  async uploadFile(filePath: string, options: { name?: string; folderId?: string } = {}): Promise<DriveFile> {
    const token = await this.getAccessToken();
    const fileName = options.name || path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    // Create metadata
    const metadata: Record<string, unknown> = { name: fileName };
    if (options.folderId) {
      metadata.parents = [options.folderId];
    }

    // Use multipart upload
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body = Buffer.concat([
      Buffer.from(
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/octet-stream\r\n\r\n'
      ),
      fileContent,
      Buffer.from(closeDelimiter),
    ]);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }

    return response.json() as Promise<DriveFile>;
  }

  async downloadFile(fileId: string, destPath: string): Promise<void> {
    const token = await this.getAccessToken();

    // First get file metadata to check if it's a Google Doc
    const file = await this.getFile(fileId);

    let downloadUrl: string;
    if (file.mimeType.startsWith('application/vnd.google-apps.')) {
      // Export Google Docs format
      const exportMime = this.getExportMime(file.mimeType);
      downloadUrl = `${DRIVE_API}/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`;
    } else {
      downloadUrl = `${DRIVE_API}/files/${fileId}?alt=media`;
    }

    const response = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
  }

  private getExportMime(googleMime: string): string {
    const mimeMap: Record<string, string> = {
      'application/vnd.google-apps.document': 'application/pdf',
      'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.google-apps.presentation': 'application/pdf',
      'application/vnd.google-apps.drawing': 'image/png',
    };
    return mimeMap[googleMime] || 'application/pdf';
  }

  async shareFile(fileId: string, email: string, role: 'reader' | 'writer' | 'commenter' = 'reader'): Promise<void> {
    const token = await this.getAccessToken();
    const response = await fetch(`${DRIVE_API}/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'user',
        role,
        emailAddress: email,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Share failed: ${error}`);
    }
  }
}

export const gdrive = new GDriveClient();
