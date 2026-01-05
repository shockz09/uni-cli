/**
 * Gmail API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gmail.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { GoogleAuthClient } from '@uni/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

interface EmailPart {
  mimeType: string;
  body?: { data?: string };
  parts?: EmailPart[];
}

interface Email {
  id: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  payload?: {
    mimeType?: string;
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: EmailPart[];
  };
  internalDate?: string;
}

interface EmailList {
  messages: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export class GmailClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gmail',
      scopes: SCOPES,
      apiBase: 'https://gmail.googleapis.com/gmail/v1',
    });
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
  async sendEmail(
    to: string,
    subject: string,
    body: string,
    attachments?: string[]
  ): Promise<{ id: string }> {
    const raw = this.createRawEmail(to, subject, body, attachments);

    return this.request<{ id: string }>('/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw }),
    });
  }

  /**
   * Create base64 encoded email with optional attachments
   */
  private createRawEmail(
    to: string,
    subject: string,
    body: string,
    attachments?: string[]
  ): string {
    if (!attachments || attachments.length === 0) {
      // Simple email without attachments
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
      ].join('\r\n');
      return Buffer.from(email).toString('base64url');
    }

    // Multipart email with attachments
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const parts: string[] = [];

    // Headers
    parts.push(`To: ${to}`);
    parts.push(`Subject: ${subject}`);
    parts.push('MIME-Version: 1.0');
    parts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    parts.push('');

    // Body part
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/plain; charset=utf-8');
    parts.push('');
    parts.push(body);

    // Attachment parts
    for (const filePath of attachments) {
      const resolvedPath = path.resolve(filePath);
      const fileName = path.basename(resolvedPath);
      const fileContent = fs.readFileSync(resolvedPath);
      const base64Content = fileContent.toString('base64');
      const mimeType = this.getMimeType(fileName);

      parts.push(`--${boundary}`);
      parts.push(`Content-Type: ${mimeType}; name="${fileName}"`);
      parts.push('Content-Transfer-Encoding: base64');
      parts.push(`Content-Disposition: attachment; filename="${fileName}"`);
      parts.push('');
      parts.push(base64Content);
    }

    parts.push(`--${boundary}--`);

    return Buffer.from(parts.join('\r\n')).toString('base64url');
  }

  /**
   * Get MIME type from filename
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.json': 'application/json',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Extract email header
   */
  getHeader(email: Email, name: string): string | undefined {
    return email.payload?.headers?.find(
      (h) => h.name.toLowerCase() === name.toLowerCase()
    )?.value;
  }

  /**
   * Recursively find a part by mime type
   */
  private findPart(parts: EmailPart[] | undefined, mimeType: string): EmailPart | undefined {
    if (!parts) return undefined;
    for (const part of parts) {
      if (part.mimeType === mimeType && part.body?.data) {
        return part;
      }
      if (part.parts) {
        const found = this.findPart(part.parts, mimeType);
        if (found) return found;
      }
    }
    return undefined;
  }

  /**
   * Convert HTML to readable plain text
   */
  private htmlToText(html: string): string {
    return html
      // Remove style and script tags with content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Convert common elements to text equivalents
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' | ')
      .replace(/<\/th>/gi, ' | ')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      // Remove all remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&hellip;/g, '...')
      .replace(/&#\d+;/g, '')
      // Clean up whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Decode email body
   */
  decodeBody(email: Email): string {
    // Direct body data (simple emails)
    if (email.payload?.body?.data) {
      const content = Buffer.from(email.payload.body.data, 'base64url').toString('utf-8');
      if (email.payload.mimeType === 'text/html') {
        return this.htmlToText(content);
      }
      return content;
    }

    // Try text/plain first (preferred)
    const textPart = this.findPart(email.payload?.parts, 'text/plain');
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
    }

    // Fall back to text/html and convert to text
    const htmlPart = this.findPart(email.payload?.parts, 'text/html');
    if (htmlPart?.body?.data) {
      const html = Buffer.from(htmlPart.body.data, 'base64url').toString('utf-8');
      return this.htmlToText(html);
    }

    // Last resort: snippet
    return email.snippet || '';
  }

  /**
   * Delete email (move to trash)
   */
  async trashEmail(id: string): Promise<void> {
    await this.request(`/users/me/messages/${id}/trash`, { method: 'POST' });
  }

  /**
   * Permanently delete email
   */
  async deleteEmail(id: string): Promise<void> {
    await this.request(`/users/me/messages/${id}`, { method: 'DELETE' });
  }
}

export const gmail = new GmailClient();
