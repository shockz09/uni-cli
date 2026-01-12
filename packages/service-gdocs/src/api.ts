/**
 * Google Docs API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gdocs.json
 */

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
];

const DOCS_API = 'https://docs.googleapis.com/v1';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

export interface Document {
  documentId: string;
  title: string;
  body?: {
    content: StructuralElement[];
  };
  revisionId?: string;
}

interface StructuralElement {
  startIndex: number;
  endIndex: number;
  paragraph?: {
    elements: ParagraphElement[];
  };
  sectionBreak?: object;
  table?: object;
  tableOfContents?: object;
}

interface ParagraphElement {
  startIndex: number;
  endIndex: number;
  textRun?: {
    content: string;
    textStyle?: object;
  };
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  createdTime?: string;
  webViewLink?: string;
}

export class GoogleDocsClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gdocs',
      scopes: SCOPES,
      apiBase: DOCS_API,
    });
  }

  /**
   * Make request to a specific API base (for Drive operations)
   */
  private async apiRequest<T>(baseUrl: string, endpoint: string, options: RequestInit = {}): Promise<T> {
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
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
    }
  }

  /**
   * List recent documents from Drive
   */
  async listDocuments(limit = 10): Promise<DriveFile[]> {
    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.document'",
      orderBy: 'modifiedTime desc',
      pageSize: String(limit),
      fields: 'files(id,name,mimeType,modifiedTime,createdTime,webViewLink)',
    });

    const response = await this.apiRequest<{ files: DriveFile[] }>(DRIVE_API, `/files?${params}`);
    return response.files || [];
  }

  /**
   * Get document content
   */
  async getDocument(documentId: string): Promise<Document> {
    return this.request<Document>(`/documents/${documentId}`);
  }

  /**
   * Extract plain text from document
   */
  extractText(doc: Document): string {
    if (!doc.body?.content) return '';

    let text = '';
    for (const element of doc.body.content) {
      if (element.paragraph?.elements) {
        for (const el of element.paragraph.elements) {
          if (el.textRun?.content) {
            text += el.textRun.content;
          }
        }
      }
    }
    return text;
  }

  /**
   * Create a new document
   */
  async createDocument(title: string): Promise<Document> {
    return this.request<Document>('/documents', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  /**
   * Append text to document
   */
  async appendText(documentId: string, text: string): Promise<void> {
    const doc = await this.getDocument(documentId);
    const endIndex = doc.body?.content?.slice(-1)[0]?.endIndex || 1;

    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: endIndex - 1 },
              text: text,
            },
          },
        ],
      }),
    });
  }

  /**
   * Replace text in document
   */
  async replaceText(documentId: string, oldText: string, newText: string): Promise<number> {
    const response = await this.request<{ replies: Array<{ replaceAllText?: { occurrencesChanged: number } }> }>(
      `/documents/${documentId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              replaceAllText: {
                containsText: { text: oldText, matchCase: true },
                replaceText: newText,
              },
            },
          ],
        }),
      }
    );

    return response.replies?.[0]?.replaceAllText?.occurrencesChanged || 0;
  }

  /**
   * Share document with email
   */
  async shareDocument(documentId: string, email: string, role: 'reader' | 'writer' = 'writer'): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${documentId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'user',
        role,
        emailAddress: email,
      }),
    });
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${documentId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Rename a document
   */
  async renameDocument(documentId: string, newTitle: string): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${documentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: newTitle }),
    });
  }

  /**
   * Replace text with case sensitivity option
   */
  async replaceText(documentId: string, oldText: string, newText: string, matchCase = true): Promise<number> {
    const response = await this.request<{ replies: Array<{ replaceAllText?: { occurrencesChanged: number } }> }>(
      `/documents/${documentId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              replaceAllText: {
                containsText: { text: oldText, matchCase },
                replaceText: newText,
              },
            },
          ],
        }),
      }
    );

    return response.replies?.[0]?.replaceAllText?.occurrencesChanged || 0;
  }

  /**
   * Insert text at a position
   */
  async insertText(documentId: string, text: string, position?: string): Promise<void> {
    let insertIndex: number;

    if (position === 'start') {
      insertIndex = 1;
    } else if (!position || position === 'end') {
      const doc = await this.getDocument(documentId);
      insertIndex = (doc.body?.content?.slice(-1)[0]?.endIndex || 2) - 1;
    } else {
      insertIndex = parseInt(position, 10);
      if (isNaN(insertIndex)) {
        throw new Error('Invalid position. Use "start", "end", or a number.');
      }
    }

    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: insertIndex },
              text,
            },
          },
        ],
      }),
    });
  }

  /**
   * Clear all document content
   */
  async clearContent(documentId: string): Promise<void> {
    const doc = await this.getDocument(documentId);
    const endIndex = doc.body?.content?.slice(-1)[0]?.endIndex || 1;

    if (endIndex <= 2) {
      // Document is already empty
      return;
    }

    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: endIndex - 1,
              },
            },
          },
        ],
      }),
    });
  }

  /**
   * Insert image from URL
   */
  async insertImage(documentId: string, imageUrl: string, width = 400, position?: string): Promise<void> {
    let insertIndex: number;

    if (position === 'start') {
      insertIndex = 1;
    } else if (!position || position === 'end') {
      const doc = await this.getDocument(documentId);
      insertIndex = (doc.body?.content?.slice(-1)[0]?.endIndex || 2) - 1;
    } else {
      insertIndex = parseInt(position, 10);
      if (isNaN(insertIndex)) {
        throw new Error('Invalid position. Use "start", "end", or a number.');
      }
    }

    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            insertInlineImage: {
              location: { index: insertIndex },
              uri: imageUrl,
              objectSize: {
                width: { magnitude: width, unit: 'PT' },
              },
            },
          },
        ],
      }),
    });
  }

  /**
   * Export document to different format
   */
  async exportDocument(documentId: string, mimeType: string): Promise<ArrayBuffer> {
    const token = await this.getAccessToken();

    const response = await fetch(`${DRIVE_API}/files/${documentId}/export?mimeType=${encodeURIComponent(mimeType)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.arrayBuffer();
  }
}

export const gdocs = new GoogleDocsClient();

/**
 * Extract document ID from URL or return as-is
 */
export function extractDocumentId(input: string): string {
  const urlMatch = input.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  return input;
}
