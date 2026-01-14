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

  // ============================================
  // TEXT FORMATTING
  // ============================================

  /**
   * Update text style in a range
   */
  async updateTextStyle(
    documentId: string,
    startIndex: number,
    endIndex: number,
    style: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      strikethrough?: boolean;
      fontSize?: number;
      foregroundColor?: { red: number; green: number; blue: number };
      backgroundColor?: { red: number; green: number; blue: number };
      fontFamily?: string;
    }
  ): Promise<void> {
    const textStyle: Record<string, unknown> = {};
    const fields: string[] = [];

    if (style.bold !== undefined) {
      textStyle.bold = style.bold;
      fields.push('bold');
    }
    if (style.italic !== undefined) {
      textStyle.italic = style.italic;
      fields.push('italic');
    }
    if (style.underline !== undefined) {
      textStyle.underline = style.underline;
      fields.push('underline');
    }
    if (style.strikethrough !== undefined) {
      textStyle.strikethrough = style.strikethrough;
      fields.push('strikethrough');
    }
    if (style.fontSize !== undefined) {
      textStyle.fontSize = { magnitude: style.fontSize, unit: 'PT' };
      fields.push('fontSize');
    }
    if (style.foregroundColor) {
      textStyle.foregroundColor = { color: { rgbColor: style.foregroundColor } };
      fields.push('foregroundColor');
    }
    if (style.backgroundColor) {
      textStyle.backgroundColor = { color: { rgbColor: style.backgroundColor } };
      fields.push('backgroundColor');
    }
    if (style.fontFamily) {
      textStyle.weightedFontFamily = { fontFamily: style.fontFamily };
      fields.push('weightedFontFamily');
    }

    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateTextStyle: {
            range: { startIndex, endIndex },
            textStyle,
            fields: fields.join(','),
          },
        }],
      }),
    });
  }

  // ============================================
  // PARAGRAPH STYLES
  // ============================================

  /**
   * Update paragraph style (headings, alignment, etc.)
   */
  async updateParagraphStyle(
    documentId: string,
    startIndex: number,
    endIndex: number,
    style: {
      namedStyleType?: 'NORMAL_TEXT' | 'TITLE' | 'SUBTITLE' | 'HEADING_1' | 'HEADING_2' | 'HEADING_3' | 'HEADING_4' | 'HEADING_5' | 'HEADING_6';
      alignment?: 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
      lineSpacing?: number;
      spaceAbove?: number;
      spaceBelow?: number;
      indentFirstLine?: number;
      indentStart?: number;
    }
  ): Promise<void> {
    const paragraphStyle: Record<string, unknown> = {};
    const fields: string[] = [];

    if (style.namedStyleType) {
      paragraphStyle.namedStyleType = style.namedStyleType;
      fields.push('namedStyleType');
    }
    if (style.alignment) {
      paragraphStyle.alignment = style.alignment;
      fields.push('alignment');
    }
    if (style.lineSpacing !== undefined) {
      paragraphStyle.lineSpacing = style.lineSpacing;
      fields.push('lineSpacing');
    }
    if (style.spaceAbove !== undefined) {
      paragraphStyle.spaceAbove = { magnitude: style.spaceAbove, unit: 'PT' };
      fields.push('spaceAbove');
    }
    if (style.spaceBelow !== undefined) {
      paragraphStyle.spaceBelow = { magnitude: style.spaceBelow, unit: 'PT' };
      fields.push('spaceBelow');
    }
    if (style.indentFirstLine !== undefined) {
      paragraphStyle.indentFirstLine = { magnitude: style.indentFirstLine, unit: 'PT' };
      fields.push('indentFirstLine');
    }
    if (style.indentStart !== undefined) {
      paragraphStyle.indentStart = { magnitude: style.indentStart, unit: 'PT' };
      fields.push('indentStart');
    }

    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateParagraphStyle: {
            range: { startIndex, endIndex },
            paragraphStyle,
            fields: fields.join(','),
          },
        }],
      }),
    });
  }

  // ============================================
  // LISTS (BULLETS & NUMBERED)
  // ============================================

  /**
   * Create bullets or numbered list
   */
  async createParagraphBullets(
    documentId: string,
    startIndex: number,
    endIndex: number,
    bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE' | 'BULLET_DIAMONDX_ARROW3D_SQUARE' | 'BULLET_CHECKBOX' | 'BULLET_ARROW_DIAMOND_DISC' | 'BULLET_STAR_CIRCLE_SQUARE' | 'BULLET_ARROW3D_CIRCLE_SQUARE' | 'BULLET_LEFTTRIANGLE_DIAMOND_DISC' | 'BULLET_DIAMONDX_HOLLOWDIAMOND_SQUARE' | 'NUMBERED_DECIMAL_ALPHA_ROMAN' | 'NUMBERED_DECIMAL_ALPHA_ROMAN_PARENS' | 'NUMBERED_DECIMAL_NESTED' | 'NUMBERED_UPPERALPHA_ALPHA_ROMAN' | 'NUMBERED_UPPERROMAN_UPPERALPHA_DECIMAL' | 'NUMBERED_ZERODECIMAL_ALPHA_ROMAN'
  ): Promise<void> {
    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          createParagraphBullets: {
            range: { startIndex, endIndex },
            bulletPreset,
          },
        }],
      }),
    });
  }

  /**
   * Remove bullets from paragraphs
   */
  async deleteParagraphBullets(documentId: string, startIndex: number, endIndex: number): Promise<void> {
    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteParagraphBullets: {
            range: { startIndex, endIndex },
          },
        }],
      }),
    });
  }

  // ============================================
  // TABLES
  // ============================================

  /**
   * Insert a table
   */
  async insertTable(documentId: string, rows: number, columns: number, insertIndex?: number): Promise<void> {
    let index: number;
    if (insertIndex !== undefined) {
      index = insertIndex;
    } else {
      const doc = await this.getDocument(documentId);
      index = (doc.body?.content?.slice(-1)[0]?.endIndex || 2) - 1;
    }

    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          insertTable: {
            rows,
            columns,
            location: { index },
          },
        }],
      }),
    });
  }

  /**
   * Delete a table row
   */
  async deleteTableRow(documentId: string, tableStartIndex: number, rowIndex: number): Promise<void> {
    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteTableRow: {
            tableCellLocation: {
              tableStartLocation: { index: tableStartIndex },
              rowIndex,
              columnIndex: 0,
            },
          },
        }],
      }),
    });
  }

  /**
   * Delete a table column
   */
  async deleteTableColumn(documentId: string, tableStartIndex: number, columnIndex: number): Promise<void> {
    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteTableColumn: {
            tableCellLocation: {
              tableStartLocation: { index: tableStartIndex },
              rowIndex: 0,
              columnIndex,
            },
          },
        }],
      }),
    });
  }

  /**
   * Insert a table row
   */
  async insertTableRow(documentId: string, tableStartIndex: number, rowIndex: number, insertBelow = true): Promise<void> {
    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          insertTableRow: {
            tableCellLocation: {
              tableStartLocation: { index: tableStartIndex },
              rowIndex,
              columnIndex: 0,
            },
            insertBelow,
          },
        }],
      }),
    });
  }

  /**
   * Insert a table column
   */
  async insertTableColumn(documentId: string, tableStartIndex: number, columnIndex: number, insertRight = true): Promise<void> {
    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          insertTableColumn: {
            tableCellLocation: {
              tableStartLocation: { index: tableStartIndex },
              rowIndex: 0,
              columnIndex,
            },
            insertRight,
          },
        }],
      }),
    });
  }

  // ============================================
  // LINKS
  // ============================================

  /**
   * Insert a link
   */
  async insertLink(documentId: string, startIndex: number, endIndex: number, url: string): Promise<void> {
    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateTextStyle: {
            range: { startIndex, endIndex },
            textStyle: {
              link: { url },
            },
            fields: 'link',
          },
        }],
      }),
    });
  }

  /**
   * Remove link from text
   */
  async removeLink(documentId: string, startIndex: number, endIndex: number): Promise<void> {
    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateTextStyle: {
            range: { startIndex, endIndex },
            textStyle: {
              link: null,
            },
            fields: 'link',
          },
        }],
      }),
    });
  }

  // ============================================
  // PAGE BREAKS
  // ============================================

  /**
   * Insert a page break
   */
  async insertPageBreak(documentId: string, insertIndex?: number): Promise<void> {
    let index: number;
    if (insertIndex !== undefined) {
      index = insertIndex;
    } else {
      const doc = await this.getDocument(documentId);
      index = (doc.body?.content?.slice(-1)[0]?.endIndex || 2) - 1;
    }

    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          insertPageBreak: {
            location: { index },
          },
        }],
      }),
    });
  }

  // ============================================
  // HEADERS & FOOTERS
  // ============================================

  /**
   * Create a header
   */
  async createHeader(documentId: string, sectionBreakLocation?: number): Promise<string> {
    const requests: Record<string, unknown>[] = [{
      createHeader: {
        type: 'DEFAULT',
        sectionBreakLocation: sectionBreakLocation !== undefined ? { index: sectionBreakLocation } : undefined,
      },
    }];

    const response = await this.request<{ replies: Array<{ createHeader?: { headerId: string } }> }>(
      `/documents/${documentId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );

    return response.replies?.[0]?.createHeader?.headerId || '';
  }

  /**
   * Delete a header
   */
  async deleteHeader(documentId: string, headerId: string): Promise<void> {
    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteHeader: { headerId },
        }],
      }),
    });
  }

  /**
   * Create a footer
   */
  async createFooter(documentId: string, sectionBreakLocation?: number): Promise<string> {
    const requests: Record<string, unknown>[] = [{
      createFooter: {
        type: 'DEFAULT',
        sectionBreakLocation: sectionBreakLocation !== undefined ? { index: sectionBreakLocation } : undefined,
      },
    }];

    const response = await this.request<{ replies: Array<{ createFooter?: { footerId: string } }> }>(
      `/documents/${documentId}:batchUpdate`,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );

    return response.replies?.[0]?.createFooter?.footerId || '';
  }

  /**
   * Delete a footer
   */
  async deleteFooter(documentId: string, footerId: string): Promise<void> {
    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteFooter: { footerId },
        }],
      }),
    });
  }

  /**
   * Insert text into header or footer
   */
  async insertTextInHeaderFooter(documentId: string, segmentId: string, text: string): Promise<void> {
    await this.request(`/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          insertText: {
            location: { segmentId, index: 0 },
            text,
          },
        }],
      }),
    });
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
