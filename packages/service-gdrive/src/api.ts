/**
 * Google Drive API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gdrive.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GoogleAuthClient } from '@uni/shared';

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

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

export class GDriveClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gdrive',
      scopes: SCOPES,
      apiBase: DRIVE_API,
    });
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
    await this.request(`/files/${fileId}`, { method: 'DELETE' });
  }

  async uploadFile(filePath: string, options: { name?: string; folderId?: string } = {}): Promise<DriveFile> {
    const token = await this.getAccessToken();
    const fileName = options.name || path.basename(filePath);
    const fileContent = fs.readFileSync(filePath);

    const metadata: Record<string, unknown> = { name: fileName };
    if (options.folderId) {
      metadata.parents = [options.folderId];
    }

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

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${error}`);
    }

    return response.json() as Promise<DriveFile>;
  }

  async downloadFile(fileId: string, destPath: string): Promise<void> {
    const token = await this.getAccessToken();
    const file = await this.getFile(fileId);

    let downloadUrl: string;
    if (file.mimeType.startsWith('application/vnd.google-apps.')) {
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
