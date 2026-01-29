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
  'https://www.googleapis.com/auth/gmail.labels',
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

  // ============================================
  // LABELS
  // ============================================

  /**
   * List all labels
   */
  async listLabels(): Promise<Array<{ id: string; name: string; type: string; messagesTotal?: number; messagesUnread?: number }>> {
    const response = await this.request<{ labels: Array<{ id: string; name: string; type: string; messagesTotal?: number; messagesUnread?: number }> }>('/users/me/labels');
    return response.labels || [];
  }

  /**
   * Get label details
   */
  async getLabel(labelId: string): Promise<{ id: string; name: string; type: string; messagesTotal?: number; messagesUnread?: number }> {
    return this.request(`/users/me/labels/${labelId}`);
  }

  /**
   * Create a label
   */
  async createLabel(name: string): Promise<{ id: string; name: string }> {
    return this.request('/users/me/labels', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Delete a label
   */
  async deleteLabel(labelId: string): Promise<void> {
    await this.request(`/users/me/labels/${labelId}`, { method: 'DELETE' });
  }

  /**
   * Add labels to message
   */
  async addLabels(messageId: string, labelIds: string[]): Promise<void> {
    await this.request(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabelIds: labelIds }),
    });
  }

  /**
   * Remove labels from message
   */
  async removeLabels(messageId: string, labelIds: string[]): Promise<void> {
    await this.request(`/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify({ removeLabelIds: labelIds }),
    });
  }

  // ============================================
  // MESSAGE OPERATIONS
  // ============================================

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.removeLabels(messageId, ['UNREAD']);
  }

  /**
   * Mark message as unread
   */
  async markAsUnread(messageId: string): Promise<void> {
    await this.addLabels(messageId, ['UNREAD']);
  }

  /**
   * Star a message
   */
  async starMessage(messageId: string): Promise<void> {
    await this.addLabels(messageId, ['STARRED']);
  }

  /**
   * Unstar a message
   */
  async unstarMessage(messageId: string): Promise<void> {
    await this.removeLabels(messageId, ['STARRED']);
  }

  /**
   * Archive a message (remove from INBOX)
   */
  async archiveMessage(messageId: string): Promise<void> {
    await this.removeLabels(messageId, ['INBOX']);
  }

  /**
   * Unarchive a message (move back to INBOX)
   */
  async unarchiveMessage(messageId: string): Promise<void> {
    await this.addLabels(messageId, ['INBOX']);
  }

  // ============================================
  // DRAFTS
  // ============================================

  /**
   * Create a draft
   */
  async createDraft(to: string, subject: string, body: string): Promise<{ id: string; message: { id: string } }> {
    const raw = this.createRawEmail(to, subject, body);
    return this.request('/users/me/drafts', {
      method: 'POST',
      body: JSON.stringify({ message: { raw } }),
    });
  }

  /**
   * List drafts
   */
  async listDrafts(maxResults = 10): Promise<Array<{ id: string; message: { id: string; threadId: string } }>> {
    const response = await this.request<{ drafts?: Array<{ id: string; message: { id: string; threadId: string } }> }>(
      `/users/me/drafts?maxResults=${maxResults}`
    );
    return response.drafts || [];
  }

  /**
   * Get draft
   */
  async getDraft(draftId: string): Promise<{ id: string; message: Email }> {
    return this.request(`/users/me/drafts/${draftId}`);
  }

  /**
   * Delete draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    await this.request(`/users/me/drafts/${draftId}`, { method: 'DELETE' });
  }

  /**
   * Send draft
   */
  async sendDraft(draftId: string): Promise<{ id: string }> {
    return this.request('/users/me/drafts/send', {
      method: 'POST',
      body: JSON.stringify({ id: draftId }),
    });
  }

  // ============================================
  // REPLY & FORWARD
  // ============================================

  /**
   * Reply to an email
   */
  async replyToEmail(originalMessageId: string, body: string, replyAll = false): Promise<{ id: string }> {
    const original = await this.getEmail(originalMessageId);
    const from = this.getHeader(original, 'From') || '';
    const to = this.getHeader(original, 'To') || '';
    const subject = this.getHeader(original, 'Subject') || '';
    const messageId = this.getHeader(original, 'Message-ID') || '';

    const replyTo = replyAll ? `${from}, ${to}` : from;
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    const headers = [
      `To: ${replyTo}`,
      `Subject: ${replySubject}`,
      `In-Reply-To: ${messageId}`,
      `References: ${messageId}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\r\n');

    const raw = Buffer.from(headers).toString('base64url');

    return this.request('/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw, threadId: original.threadId }),
    });
  }

  /**
   * Forward an email
   */
  async forwardEmail(originalMessageId: string, to: string, additionalMessage?: string): Promise<{ id: string }> {
    const original = await this.getEmail(originalMessageId);
    const originalFrom = this.getHeader(original, 'From') || 'Unknown';
    const originalSubject = this.getHeader(original, 'Subject') || 'No Subject';
    const originalDate = this.getHeader(original, 'Date') || '';
    const originalBody = this.decodeBody(original);

    const forwardSubject = originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}`;
    const forwardBody = [
      additionalMessage || '',
      '',
      '---------- Forwarded message ---------',
      `From: ${originalFrom}`,
      `Date: ${originalDate}`,
      `Subject: ${originalSubject}`,
      '',
      originalBody,
    ].join('\n');

    const raw = this.createRawEmail(to, forwardSubject, forwardBody);
    return this.request('/users/me/messages/send', {
      method: 'POST',
      body: JSON.stringify({ raw }),
    });
  }

  // ============================================
  // THREADS
  // ============================================

  /**
   * List threads
   */
  async listThreads(options: { maxResults?: number; q?: string } = {}): Promise<Array<{ id: string; snippet: string; historyId: string }>> {
    const { maxResults = 20, q } = options;
    const params = new URLSearchParams({ maxResults: String(maxResults) });
    if (q) params.set('q', q);

    const response = await this.request<{ threads?: Array<{ id: string; snippet: string; historyId: string }> }>(`/users/me/threads?${params}`);
    return response.threads || [];
  }

  /**
   * Get thread
   */
  async getThread(threadId: string): Promise<{ id: string; messages: Email[]; snippet: string }> {
    return this.request(`/users/me/threads/${threadId}`);
  }

  // ============================================
  // UNSUBSCRIBE
  // ============================================

  /**
   * Get unsubscribe info from email headers
   * Returns mailto and/or URL options for unsubscribing
   */
  getUnsubscribeInfo(email: Email): { mailto?: string; url?: string; oneClick: boolean } | null {
    const listUnsubscribe = this.getHeader(email, 'List-Unsubscribe');
    if (!listUnsubscribe) return null;

    const listUnsubscribePost = this.getHeader(email, 'List-Unsubscribe-Post');
    const oneClick = listUnsubscribePost?.toLowerCase().includes('list-unsubscribe=one-click') || false;

    // Parse List-Unsubscribe header - can contain mailto: and/or https: URLs
    // Format: <mailto:unsub@example.com>, <https://example.com/unsub?id=123>
    const mailtoMatch = listUnsubscribe.match(/<mailto:([^>]+)>/i);
    const urlMatch = listUnsubscribe.match(/<(https?:\/\/[^>]+)>/i);

    if (!mailtoMatch && !urlMatch) return null;

    return {
      mailto: mailtoMatch ? mailtoMatch[1] : undefined,
      url: urlMatch ? urlMatch[1] : undefined,
      oneClick,
    };
  }

  /**
   * Unsubscribe from a mailing list via mailto
   * Sends an email to the unsubscribe address
   */
  async unsubscribeViaEmail(unsubscribeAddress: string): Promise<{ id: string }> {
    // Parse mailto: which may include subject and body params
    // mailto:unsub@example.com?subject=Unsubscribe&body=Please%20unsubscribe
    const [email, params] = unsubscribeAddress.split('?');
    let subject = 'Unsubscribe';
    let body = 'Please unsubscribe me from this mailing list.';

    if (params) {
      const searchParams = new URLSearchParams(params);
      if (searchParams.has('subject')) subject = searchParams.get('subject')!;
      if (searchParams.has('body')) body = decodeURIComponent(searchParams.get('body')!);
    }

    return this.sendEmail(email, subject, body);
  }

  /**
   * Unsubscribe via HTTP POST (one-click or regular)
   */
  async unsubscribeViaUrl(url: string, oneClick: boolean): Promise<boolean> {
    const headers: Record<string, string> = {
      'User-Agent': 'uni-cli/1.0',
    };

    let requestBody: string | undefined;
    if (oneClick) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      requestBody = 'List-Unsubscribe=One-Click';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: requestBody,
      redirect: 'follow',
    });

    // 2xx status codes indicate success
    return response.ok;
  }
}

export const gmail = new GmailClient();
