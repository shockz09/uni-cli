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
  charts?: Array<{
    chartId: number;
    spec?: {
      title?: string;
      basicChart?: {
        chartType?: string;
      };
    };
    position?: {
      overlayPosition?: {
        anchorCell?: {
          sheetId: number;
          rowIndex: number;
          columnIndex: number;
        };
        widthPixels?: number;
        heightPixels?: number;
      };
    };
  }>;
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
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
    }
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
      `/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties,sheets.properties,sheets.charts,spreadsheetUrl`
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
   * Clear cell values in a range (keeps formatting)
   */
  async clearValues(spreadsheetId: string, range: string): Promise<void> {
    const encodedRange = encodeURIComponent(range);
    await this.request(
      `/spreadsheets/${spreadsheetId}/values/${encodedRange}:clear`,
      { method: 'POST', body: JSON.stringify({}) }
    );
  }

  /**
   * Duplicate a sheet within the same spreadsheet
   */
  async duplicateSheet(
    spreadsheetId: string,
    sheetId: number,
    newName: string,
    insertIndex?: number
  ): Promise<{ sheetId: number; title: string }> {
    const response = await this.request<{
      replies: Array<{ duplicateSheet: { properties: { sheetId: number; title: string } } }>;
    }>(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          duplicateSheet: {
            sourceSheetId: sheetId,
            insertSheetIndex: insertIndex,
            newSheetName: newName,
          },
        }],
      }),
    });
    const props = response.replies[0].duplicateSheet.properties;
    return { sheetId: props.sheetId, title: props.title };
  }

  /**
   * Apply conditional formatting (alternating colors)
   */
  async addAlternatingColors(
    spreadsheetId: string,
    sheetId: number,
    range: { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
    headerColor?: { red: number; green: number; blue: number },
    oddColor?: { red: number; green: number; blue: number },
    evenColor?: { red: number; green: number; blue: number }
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          addBanding: {
            bandedRange: {
              range: { sheetId, ...range },
              rowProperties: {
                headerColor: headerColor || { red: 0.26, green: 0.52, blue: 0.96 },
                firstBandColor: oddColor || { red: 1, green: 1, blue: 1 },
                secondBandColor: evenColor || { red: 0.95, green: 0.95, blue: 0.95 },
              },
            },
          },
        }],
      }),
    });
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
   * Share spreadsheet publicly (anyone with link)
   */
  async sharePublic(
    spreadsheetId: string,
    role: 'reader' | 'writer' = 'reader'
  ): Promise<void> {
    await this.apiRequest(DRIVE_API, `/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'anyone',
        role,
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

  /**
   * Rename a spreadsheet
   */
  async renameSpreadsheet(spreadsheetId: string, newTitle: string): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateSpreadsheetProperties: {
            properties: { title: newTitle },
            fields: 'title',
          },
        }],
      }),
    });
  }

  /**
   * Sort a range by column
   */
  async sortRange(
    spreadsheetId: string,
    range: { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
    sortColumn: number,
    descending: boolean
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          sortRange: {
            range,
            sortSpecs: [{
              dimensionIndex: sortColumn,
              sortOrder: descending ? 'DESCENDING' : 'ASCENDING',
            }],
          },
        }],
      }),
    });
  }

  /**
   * Add a new sheet (tab) to spreadsheet
   */
  async addSheet(spreadsheetId: string, title: string): Promise<{ sheetId: number; title: string }> {
    const response = await this.request<{
      replies: Array<{ addSheet: { properties: { sheetId: number; title: string } } }>;
    }>(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title } } }],
      }),
    });
    const props = response.replies[0].addSheet.properties;
    return { sheetId: props.sheetId, title: props.title };
  }

  /**
   * Rename a sheet
   */
  async renameSheet(spreadsheetId: string, sheetId: number, newTitle: string): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateSheetProperties: {
            properties: { sheetId, title: newTitle },
            fields: 'title',
          },
        }],
      }),
    });
  }

  /**
   * Delete a sheet
   */
  async deleteSheet(spreadsheetId: string, sheetId: number): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{ deleteSheet: { sheetId } }],
      }),
    });
  }

  /**
   * Apply formatting to cells via batchUpdate
   */
  async formatCells(
    spreadsheetId: string,
    sheetId: number,
    range: { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
    format: {
      bold?: boolean;
      italic?: boolean;
      fontSize?: number;
      backgroundColor?: { red: number; green: number; blue: number };
      textColor?: { red: number; green: number; blue: number };
    }
  ): Promise<void> {
    const textFormat: Record<string, unknown> = {};
    const cellFormat: Record<string, unknown> = {};
    const fields: string[] = [];

    if (format.bold !== undefined) {
      textFormat.bold = format.bold;
      fields.push('userEnteredFormat.textFormat.bold');
    }
    if (format.italic !== undefined) {
      textFormat.italic = format.italic;
      fields.push('userEnteredFormat.textFormat.italic');
    }
    if (format.fontSize !== undefined) {
      textFormat.fontSize = format.fontSize;
      fields.push('userEnteredFormat.textFormat.fontSize');
    }
    if (format.backgroundColor) {
      cellFormat.backgroundColor = format.backgroundColor;
      fields.push('userEnteredFormat.backgroundColor');
    }
    if (format.textColor) {
      textFormat.foregroundColor = format.textColor;
      fields.push('userEnteredFormat.textFormat.foregroundColor');
    }

    if (Object.keys(textFormat).length > 0) {
      cellFormat.textFormat = textFormat;
    }

    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          repeatCell: {
            range: { sheetId, ...range },
            cell: { userEnteredFormat: cellFormat },
            fields: fields.join(','),
          },
        }],
      }),
    });
  }

  /**
   * Create a chart with full positioning and styling options
   */
  async createChart(
    spreadsheetId: string,
    sheetId: number,
    dataRange: { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
    chartType: string = 'COLUMN',
    title?: string,
    labelsRange?: { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
    options?: {
      anchorCell?: { rowIndex: number; columnIndex: number };
      width?: number;
      height?: number;
      legendPosition?: string;
    }
  ): Promise<number> {
    const { anchorCell, width = 600, height = 371, legendPosition = 'BOTTOM_LEGEND' } = options || {};

    // Determine anchor cell position
    const anchor = anchorCell || { rowIndex: 0, columnIndex: dataRange.endColumnIndex + 1 };

    // Build chart spec based on type
    let spec: Record<string, unknown>;

    if (chartType === 'PIE') {
      // Pie charts use pieChart spec
      spec = {
        title,
        pieChart: {
          legendPosition,
          domain: labelsRange ? {
            sourceRange: {
              sources: [{ sheetId, ...labelsRange }],
            },
          } : undefined,
          series: {
            sourceRange: {
              sources: [{
                sheetId,
                startRowIndex: dataRange.startRowIndex,
                endRowIndex: dataRange.endRowIndex,
                startColumnIndex: dataRange.startColumnIndex,
                endColumnIndex: dataRange.startColumnIndex + 1,
              }],
            },
          },
        },
      };
    } else {
      // Bar/Column/Line/Area/Scatter use basicChart spec
      // Bar charts need BOTTOM_AXIS, others use LEFT_AXIS
      const targetAxis = chartType === 'BAR' ? 'BOTTOM_AXIS' : 'LEFT_AXIS';

      const series = [];
      for (let col = dataRange.startColumnIndex; col < dataRange.endColumnIndex; col++) {
        series.push({
          series: {
            sourceRange: {
              sources: [{
                sheetId,
                startRowIndex: dataRange.startRowIndex,
                endRowIndex: dataRange.endRowIndex,
                startColumnIndex: col,
                endColumnIndex: col + 1,
              }],
            },
          },
          targetAxis,
        });
      }

      const domains = labelsRange ? [{
        domain: {
          sourceRange: {
            sources: [{ sheetId, ...labelsRange }],
          },
        },
      }] : [];

      spec = {
        title,
        basicChart: {
          chartType,
          legendPosition,
          domains,
          series,
        },
      };
    }

    const response = await this.request<{
      replies: Array<{ addChart: { chart: { chartId: number } } }>;
    }>(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          addChart: {
            chart: {
              spec,
              position: {
                overlayPosition: {
                  anchorCell: { sheetId, ...anchor },
                  widthPixels: width,
                  heightPixels: height,
                },
              },
            },
          },
        }],
      }),
    });
    return response.replies[0].addChart.chart.chartId;
  }

  /**
   * List all charts in a spreadsheet
   */
  async listCharts(spreadsheetId: string): Promise<Array<{
    chartId: number;
    title?: string;
    chartType?: string;
    sheetId: number;
    sheetName: string;
    position?: { row: number; col: number };
    size?: { width?: number; height?: number };
  }>> {
    const spreadsheet = await this.getSpreadsheet(spreadsheetId);
    const charts: Array<{
      chartId: number;
      title?: string;
      chartType?: string;
      sheetId: number;
      sheetName: string;
      position?: { row: number; col: number };
      size?: { width?: number; height?: number };
    }> = [];

    for (const sheet of spreadsheet.sheets || []) {
      const sheetCharts = sheet.charts || [];
      for (const chart of sheetCharts) {
        const pos = chart.position?.overlayPosition?.anchorCell;
        const overlay = chart.position?.overlayPosition;
        charts.push({
          chartId: chart.chartId,
          title: chart.spec?.title,
          chartType: chart.spec?.basicChart?.chartType,
          sheetId: sheet.properties.sheetId,
          sheetName: sheet.properties.title,
          position: pos ? { row: pos.rowIndex + 1, col: pos.columnIndex + 1 } : undefined,
          size: overlay ? { width: overlay.widthPixels, height: overlay.heightPixels } : undefined,
        });
      }
    }

    return charts;
  }

  /**
   * Delete a chart
   */
  async deleteChart(spreadsheetId: string, chartId: number): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteEmbeddedObject: {
            objectId: chartId,
          },
        }],
      }),
    });
  }

  /**
   * Move/resize a chart
   */
  async moveChart(
    spreadsheetId: string,
    chartId: number,
    sheetId: number,
    anchorCell: { rowIndex: number; columnIndex: number },
    width?: number,
    height?: number
  ): Promise<void> {
    const overlayPosition: Record<string, unknown> = {
      anchorCell: { sheetId, ...anchorCell },
    };

    // Build fields list based on what we're updating
    const fields = ['anchorCell'];
    if (width) {
      overlayPosition.widthPixels = width;
      fields.push('widthPixels');
    }
    if (height) {
      overlayPosition.heightPixels = height;
      fields.push('heightPixels');
    }

    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateEmbeddedObjectPosition: {
            objectId: chartId,
            newPosition: { overlayPosition },
            fields: fields.join(','),
          },
        }],
      }),
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
