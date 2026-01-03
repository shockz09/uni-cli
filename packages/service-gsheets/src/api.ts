/**
 * Google Sheets API Client
 *
 * Extends GoogleAuthClient for OAuth handling.
 * Tokens stored in ~/.uni/tokens/gsheets.json
 */

import { GoogleAuthClient } from '@uni/shared';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

const SHEETS_API = 'https://sheets.googleapis.com/v4';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

export interface Spreadsheet {
  spreadsheetId: string;
  properties: {
    title: string;
    locale?: string;
    timeZone?: string;
  };
  sheets?: Sheet[];
  spreadsheetUrl: string;
}

export interface Sheet {
  properties: {
    sheetId: number;
    title: string;
    index: number;
    gridProperties?: {
      rowCount: number;
      columnCount: number;
    };
  };
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

export class GoogleSheetsClient extends GoogleAuthClient {
  constructor() {
    super({
      serviceName: 'gsheets',
      scopes: SCOPES,
      apiBase: SHEETS_API,
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
    return JSON.parse(text) as T;
  }

  /**
   * List recent spreadsheets from Drive
   */
  async listSpreadsheets(limit = 10): Promise<DriveFile[]> {
    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      orderBy: 'modifiedTime desc',
      pageSize: String(limit),
      fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    });

    const response = await this.apiRequest<{ files: DriveFile[] }>(DRIVE_API, `/files?${params}`);
    return response.files || [];
  }

  /**
   * Get spreadsheet metadata
   */
  async getSpreadsheet(spreadsheetId: string): Promise<Spreadsheet> {
    return this.request<Spreadsheet>(
      `/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties,sheets.properties,spreadsheetUrl`
    );
  }

  /**
   * Get cell values from a range
   */
  async getValues(spreadsheetId: string, range: string): Promise<string[][]> {
    const encodedRange = encodeURIComponent(range);
    const response = await this.request<{ values?: string[][] }>(
      `/spreadsheets/${spreadsheetId}/values/${encodedRange}`
    );
    return response.values || [];
  }

  /**
   * Set a single cell value
   */
  async setValue(spreadsheetId: string, range: string, value: string): Promise<void> {
    const encodedRange = encodeURIComponent(range);
    await this.request(
      `/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [[value]] }),
      }
    );
  }

  /**
   * Set multiple cell values
   */
  async setValues(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
    const encodedRange = encodeURIComponent(range);
    await this.request(
      `/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values }),
      }
    );
  }

  /**
   * Append rows to a sheet
   */
  async appendRows(spreadsheetId: string, range: string, values: string[][]): Promise<void> {
    const encodedRange = encodeURIComponent(range);
    await this.request(
      `/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        body: JSON.stringify({ values }),
      }
    );
  }

  /**
   * Create a new spreadsheet
   */
  async createSpreadsheet(title: string): Promise<Spreadsheet> {
    return this.request<Spreadsheet>('/spreadsheets', {
      method: 'POST',
      body: JSON.stringify({
        properties: { title },
      }),
    });
  }

  /**
   * Share spreadsheet with email
   */
  async shareSpreadsheet(
    spreadsheetId: string,
    email: string,
    role: 'reader' | 'writer' = 'writer'
  ): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'user',
        role,
        emailAddress: email,
      }),
    });
  }

  /**
   * Delete a spreadsheet
   */
  async deleteSpreadsheet(spreadsheetId: string): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${spreadsheetId}`, {
      method: 'DELETE',
    });
  }
}

export const gsheets = new GoogleSheetsClient();

/**
 * Extract spreadsheet ID from URL or return as-is
 */
export function extractSpreadsheetId(input: string): string {
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }
  return input;
}
