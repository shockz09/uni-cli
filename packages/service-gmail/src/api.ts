/**
 * Gmail API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gmail.json
 */

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

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
      (h) => h.name.toLowerCase() === name.toLowerCase()
    )?.value;
  }

  /**
   * Decode email body
   */
  decodeBody(email: Email): string {
    if (email.payload?.body?.data) {
      return Buffer.from(email.payload.body.data, 'base64url').toString('utf-8');
    }

    const textPart = email.payload?.parts?.find((p) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
    }

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
