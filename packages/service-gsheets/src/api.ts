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
      frozenRowCount?: number;
      frozenColumnCount?: number;
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
      `/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties,sheets.properties,sheets.charts,sheets.conditionalFormats,spreadsheetUrl`
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

  /**
   * Set a note on a cell
   */
  async setNote(spreadsheetId: string, sheetId: number, rowIndex: number, columnIndex: number, note: string): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateCells: {
            range: {
              sheetId,
              startRowIndex: rowIndex,
              endRowIndex: rowIndex + 1,
              startColumnIndex: columnIndex,
              endColumnIndex: columnIndex + 1,
            },
            rows: [{
              values: [{
                note: note || null,
              }],
            }],
            fields: 'note',
          },
        }],
      }),
    });
  }

  /**
   * Set the same note on multiple cells in a range
   */
  async setNoteRange(
    spreadsheetId: string,
    sheetId: number,
    startRowIndex: number,
    endRowIndex: number,
    startColumnIndex: number,
    endColumnIndex: number,
    note: string
  ): Promise<void> {
    const numRows = endRowIndex - startRowIndex;
    const numCols = endColumnIndex - startColumnIndex;

    // Build rows array with the same note for each cell
    const rows = [];
    for (let r = 0; r < numRows; r++) {
      const values = [];
      for (let c = 0; c < numCols; c++) {
        values.push({ note: note || null });
      }
      rows.push({ values });
    }

    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateCells: {
            range: {
              sheetId,
              startRowIndex,
              endRowIndex,
              startColumnIndex,
              endColumnIndex,
            },
            rows,
            fields: 'note',
          },
        }],
      }),
    });
  }

  /**
   * Get a note from a cell
   */
  async getNote(spreadsheetId: string, sheetName: string, rowIndex: number, columnIndex: number): Promise<string | null> {
    const notes = await this.getNotesRange(spreadsheetId, sheetName, rowIndex, rowIndex + 1, columnIndex, columnIndex + 1);
    return notes[0]?.[0] || null;
  }

  /**
   * Get notes from a range of cells
   * Returns 2D array of notes (null for cells without notes)
   */
  async getNotesRange(
    spreadsheetId: string,
    sheetName: string,
    startRowIndex: number,
    endRowIndex: number,
    startColumnIndex: number,
    endColumnIndex: number
  ): Promise<(string | null)[][]> {
    const encodedSheetName = encodeURIComponent(`'${sheetName}'`);
    // Use R1C1 notation for the range
    const rangeNotation = `R${startRowIndex + 1}C${startColumnIndex + 1}:R${endRowIndex}C${endColumnIndex}`;

    const response = await this.request<{
      sheets: Array<{
        data: Array<{
          rowData?: Array<{
            values?: Array<{
              note?: string;
            }>;
          }>;
        }>;
      }>;
    }>(`/spreadsheets/${spreadsheetId}?ranges=${encodedSheetName}!${rangeNotation}&fields=sheets.data.rowData.values.note`);

    const rowData = response.sheets?.[0]?.data?.[0]?.rowData || [];
    const numRows = endRowIndex - startRowIndex;
    const numCols = endColumnIndex - startColumnIndex;

    // Build 2D array of notes
    const notes: (string | null)[][] = [];
    for (let r = 0; r < numRows; r++) {
      const row: (string | null)[] = [];
      for (let c = 0; c < numCols; c++) {
        const note = rowData[r]?.values?.[c]?.note || null;
        row.push(note);
      }
      notes.push(row);
    }

    return notes;
  }

  /**
   * Add conditional formatting rule
   */
  async addConditionalFormat(
    spreadsheetId: string,
    range: { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
    ruleType: string,
    value?: string,
    value2?: string,
    bgColor?: { red: number; green: number; blue: number },
    textColor?: { red: number; green: number; blue: number },
    bold?: boolean
  ): Promise<void> {
    // Build condition based on type
    let condition: Record<string, unknown>;
    switch (ruleType) {
      case 'gt':
        condition = { type: 'NUMBER_GREATER', values: [{ userEnteredValue: value }] };
        break;
      case 'lt':
        condition = { type: 'NUMBER_LESS', values: [{ userEnteredValue: value }] };
        break;
      case 'eq':
        condition = { type: 'NUMBER_EQ', values: [{ userEnteredValue: value }] };
        break;
      case 'ne':
        condition = { type: 'NUMBER_NOT_EQ', values: [{ userEnteredValue: value }] };
        break;
      case 'empty':
        condition = { type: 'BLANK' };
        break;
      case 'not-empty':
        condition = { type: 'NOT_BLANK' };
        break;
      case 'contains':
        condition = { type: 'TEXT_CONTAINS', values: [{ userEnteredValue: value }] };
        break;
      case 'between':
        condition = { type: 'NUMBER_BETWEEN', values: [{ userEnteredValue: value }, { userEnteredValue: value2 }] };
        break;
      default:
        throw new Error(`Unknown rule type: ${ruleType}`);
    }

    // Build format
    const format: Record<string, unknown> = {};
    if (bgColor) format.backgroundColor = bgColor;
    if (textColor || bold) {
      format.textFormat = {};
      if (textColor) (format.textFormat as Record<string, unknown>).foregroundColor = textColor;
      if (bold) (format.textFormat as Record<string, unknown>).bold = true;
    }

    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          addConditionalFormatRule: {
            rule: {
              ranges: [range],
              booleanRule: {
                condition,
                format,
              },
            },
            index: 0,
          },
        }],
      }),
    });
  }

  /**
   * List conditional formatting rules
   */
  async listConditionalFormats(spreadsheetId: string): Promise<Array<{
    ruleIndex: number;
    sheetId: number;
    ranges: string;
    condition: string;
    format: string;
  }>> {
    const spreadsheet = await this.getSpreadsheet(spreadsheetId);
    const rules: Array<{
      ruleIndex: number;
      sheetId: number;
      ranges: string;
      condition: string;
      format: string;
    }> = [];

    for (const sheet of spreadsheet.sheets || []) {
      const conditionalFormats = (sheet as Record<string, unknown>).conditionalFormats as Array<Record<string, unknown>> | undefined;
      if (!conditionalFormats) continue;

      conditionalFormats.forEach((rule, index) => {
        const booleanRule = rule.booleanRule as Record<string, unknown> | undefined;
        const gradientRule = rule.gradientRule as Record<string, unknown> | undefined;
        const ranges = rule.ranges as Array<Record<string, number>> | undefined;

        let rangeStr = '';
        if (ranges && ranges.length > 0) {
          const r = ranges[0];
          const colToLetter = (col: number) => {
            let letter = '';
            let temp = col;
            while (temp >= 0) {
              letter = String.fromCharCode((temp % 26) + 65) + letter;
              temp = Math.floor(temp / 26) - 1;
            }
            return letter;
          };
          rangeStr = `${colToLetter(r.startColumnIndex || 0)}${(r.startRowIndex || 0) + 1}:${colToLetter((r.endColumnIndex || 1) - 1)}${r.endRowIndex || 1}`;
        }

        let conditionStr = '';
        let formatStr = '';

        if (booleanRule) {
          const condition = booleanRule.condition as Record<string, unknown> | undefined;
          const format = booleanRule.format as Record<string, unknown> | undefined;

          if (condition) {
            conditionStr = condition.type as string || 'unknown';
            const values = condition.values as Array<Record<string, string>> | undefined;
            if (values && values.length > 0) {
              conditionStr += ` (${values.map(v => v.userEnteredValue).join(', ')})`;
            }
          }

          if (format) {
            const parts = [];
            if (format.backgroundColor) parts.push('bg');
            if (format.textFormat) parts.push('text');
            formatStr = parts.join(', ') || 'default';
          }
        } else if (gradientRule) {
          conditionStr = 'gradient';
          formatStr = 'gradient';
        }

        rules.push({
          ruleIndex: index,
          sheetId: sheet.properties.sheetId,
          ranges: rangeStr,
          condition: conditionStr,
          format: formatStr,
        });
      });
    }

    return rules;
  }

  /**
   * Delete a conditional formatting rule by index
   */
  async deleteConditionalFormat(spreadsheetId: string, sheetId: number, ruleIndex: number): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteConditionalFormatRule: {
            sheetId,
            index: ruleIndex,
          },
        }],
      }),
    });
  }

  /**
   * Merge cells
   */
  async mergeCells(
    spreadsheetId: string,
    range: { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
    mergeType: string = 'all'
  ): Promise<void> {
    const typeMap: Record<string, string> = {
      all: 'MERGE_ALL',
      horizontal: 'MERGE_ROWS',
      vertical: 'MERGE_COLUMNS',
    };

    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          mergeCells: {
            range,
            mergeType: typeMap[mergeType] || 'MERGE_ALL',
          },
        }],
      }),
    });
  }

  /**
   * Unmerge cells
   */
  async unmergeCells(
    spreadsheetId: string,
    range: { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number }
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          unmergeCells: { range },
        }],
      }),
    });
  }

  /**
   * Add protection to sheet or range
   */
  async addProtection(
    spreadsheetId: string,
    sheetId: number,
    range?: { sheetId: number; startRowIndex?: number; endRowIndex?: number; startColumnIndex?: number; endColumnIndex?: number },
    description?: string,
    warningOnly?: boolean
  ): Promise<void> {
    const protectedRange: Record<string, unknown> = {
      description,
      warningOnly: warningOnly || false,
    };

    if (range) {
      protectedRange.range = range;
    } else {
      protectedRange.range = { sheetId };
    }

    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          addProtectedRange: { protectedRange },
        }],
      }),
    });
  }

  /**
   * List protections
   */
  async listProtections(spreadsheetId: string): Promise<Array<{
    protectedRangeId: number;
    description?: string;
    range?: object;
    warningOnly: boolean;
  }>> {
    // Need to get full spreadsheet data with protections
    const response = await this.request<{
      sheets: Array<{
        protectedRanges?: Array<{
          protectedRangeId: number;
          description?: string;
          range?: object;
          warningOnly?: boolean;
        }>;
      }>;
    }>(`/spreadsheets/${spreadsheetId}?fields=sheets.protectedRanges`);

    const protections: Array<{
      protectedRangeId: number;
      description?: string;
      range?: object;
      warningOnly: boolean;
    }> = [];

    for (const sheet of response.sheets || []) {
      for (const p of sheet.protectedRanges || []) {
        protections.push({
          protectedRangeId: p.protectedRangeId,
          description: p.description,
          range: p.range,
          warningOnly: p.warningOnly || false,
        });
      }
    }

    return protections;
  }

  // ============================================
  // NAMED RANGES
  // ============================================

  /**
   * List all named ranges in a spreadsheet
   */
  async listNamedRanges(spreadsheetId: string): Promise<Array<{
    namedRangeId: string;
    name: string;
    range: string;
    sheetId: number;
  }>> {
    const response = await this.request<{
      namedRanges?: Array<{
        namedRangeId: string;
        name: string;
        range: {
          sheetId: number;
          startRowIndex?: number;
          endRowIndex?: number;
          startColumnIndex?: number;
          endColumnIndex?: number;
        };
      }>;
    }>(`/spreadsheets/${spreadsheetId}?fields=namedRanges`);

    const colToLetter = (col: number) => {
      let letter = '';
      let temp = col;
      while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
      }
      return letter;
    };

    return (response.namedRanges || []).map(nr => {
      const r = nr.range;
      const startCol = colToLetter(r.startColumnIndex || 0);
      const endCol = colToLetter((r.endColumnIndex || 1) - 1);
      const startRow = (r.startRowIndex || 0) + 1;
      const endRow = r.endRowIndex || 1;
      return {
        namedRangeId: nr.namedRangeId,
        name: nr.name,
        range: `${startCol}${startRow}:${endCol}${endRow}`,
        sheetId: r.sheetId,
      };
    });
  }

  /**
   * Add a named range
   */
  async addNamedRange(
    spreadsheetId: string,
    name: string,
    range: { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number }
  ): Promise<string> {
    const response = await this.request<{
      replies: Array<{ addNamedRange: { namedRange: { namedRangeId: string } } }>;
    }>(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          addNamedRange: {
            namedRange: { name, range },
          },
        }],
      }),
    });
    return response.replies[0].addNamedRange.namedRange.namedRangeId;
  }

  /**
   * Delete a named range
   */
  async deleteNamedRange(spreadsheetId: string, namedRangeId: string): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteNamedRange: { namedRangeId },
        }],
      }),
    });
  }

  /**
   * Update a named range
   */
  async updateNamedRange(
    spreadsheetId: string,
    namedRangeId: string,
    name?: string,
    range?: { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number }
  ): Promise<void> {
    const namedRange: Record<string, unknown> = { namedRangeId };
    const fields: string[] = [];

    if (name) {
      namedRange.name = name;
      fields.push('name');
    }
    if (range) {
      namedRange.range = range;
      fields.push('range');
    }

    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateNamedRange: {
            namedRange,
            fields: fields.join(','),
          },
        }],
      }),
    });
  }

  // ============================================
  // DATA VALIDATION
  // ============================================

  /**
   * Set data validation on a range
   */
  async setDataValidation(
    spreadsheetId: string,
    range: { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
    rule: {
      type: 'list' | 'number' | 'date' | 'checkbox' | 'custom' | 'text';
      values?: string[];           // for list
      min?: number;                // for number range
      max?: number;                // for number range
      operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne' | 'between';
      dateOperator?: 'before' | 'after' | 'on' | 'between';
      date?: string;               // ISO date string
      date2?: string;              // for between
      formula?: string;            // for custom
      strict?: boolean;            // reject invalid
      showDropdown?: boolean;      // show UI
      inputMessage?: string;       // help text
    } | null
  ): Promise<void> {
    if (rule === null) {
      // Clear validation
      await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({
          requests: [{
            setDataValidation: { range },
          }],
        }),
      });
      return;
    }

    let condition: Record<string, unknown>;

    switch (rule.type) {
      case 'list':
        condition = {
          type: 'ONE_OF_LIST',
          values: (rule.values || []).map(v => ({ userEnteredValue: v })),
        };
        break;
      case 'checkbox':
        condition = { type: 'BOOLEAN' };
        break;
      case 'number': {
        const numOps: Record<string, string> = {
          gt: 'NUMBER_GREATER',
          gte: 'NUMBER_GREATER_THAN_EQ',
          lt: 'NUMBER_LESS',
          lte: 'NUMBER_LESS_THAN_EQ',
          eq: 'NUMBER_EQ',
          ne: 'NUMBER_NOT_EQ',
          between: 'NUMBER_BETWEEN',
        };
        const op = rule.operator || (rule.min !== undefined && rule.max !== undefined ? 'between' : 'gte');
        condition = { type: numOps[op] || 'NUMBER_GREATER_THAN_EQ' };
        if (op === 'between' && rule.min !== undefined && rule.max !== undefined) {
          condition.values = [
            { userEnteredValue: String(rule.min) },
            { userEnteredValue: String(rule.max) },
          ];
        } else if (rule.min !== undefined) {
          condition.values = [{ userEnteredValue: String(rule.min) }];
        } else if (rule.max !== undefined) {
          condition.values = [{ userEnteredValue: String(rule.max) }];
        }
        break;
      }
      case 'date': {
        const dateOps: Record<string, string> = {
          before: 'DATE_BEFORE',
          after: 'DATE_AFTER',
          on: 'DATE_EQ',
          between: 'DATE_BETWEEN',
        };
        const dateOp = rule.dateOperator || 'after';
        condition = { type: dateOps[dateOp] || 'DATE_AFTER' };
        if (dateOp === 'between' && rule.date && rule.date2) {
          condition.values = [
            { userEnteredValue: rule.date },
            { userEnteredValue: rule.date2 },
          ];
        } else if (rule.date) {
          condition.values = [{ userEnteredValue: rule.date }];
        }
        break;
      }
      case 'text':
        condition = { type: 'TEXT_NOT_EQ', values: [{ userEnteredValue: '' }] };
        break;
      case 'custom':
        condition = {
          type: 'CUSTOM_FORMULA',
          values: [{ userEnteredValue: rule.formula || '=TRUE' }],
        };
        break;
      default:
        throw new Error(`Unknown validation type: ${rule.type}`);
    }

    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          setDataValidation: {
            range,
            rule: {
              condition,
              strict: rule.strict ?? true,
              showCustomUi: rule.showDropdown ?? true,
              inputMessage: rule.inputMessage,
            },
          },
        }],
      }),
    });
  }

  // ============================================
  // FREEZE ROWS/COLUMNS
  // ============================================

  /**
   * Freeze rows and/or columns
   */
  async freezeRowsColumns(
    spreadsheetId: string,
    sheetId: number,
    frozenRowCount?: number,
    frozenColumnCount?: number
  ): Promise<void> {
    const gridProperties: Record<string, number> = {};
    const fields: string[] = [];

    if (frozenRowCount !== undefined) {
      gridProperties.frozenRowCount = frozenRowCount;
      fields.push('gridProperties.frozenRowCount');
    }
    if (frozenColumnCount !== undefined) {
      gridProperties.frozenColumnCount = frozenColumnCount;
      fields.push('gridProperties.frozenColumnCount');
    }

    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateSheetProperties: {
            properties: { sheetId, gridProperties },
            fields: fields.join(','),
          },
        }],
      }),
    });
  }

  /**
   * Get current freeze state
   */
  async getFreezeState(spreadsheetId: string, sheetId: number): Promise<{ rows: number; cols: number }> {
    const spreadsheet = await this.getSpreadsheet(spreadsheetId);
    const sheet = spreadsheet.sheets?.find(s => s.properties.sheetId === sheetId);
    return {
      rows: sheet?.properties.gridProperties?.frozenRowCount || 0,
      cols: sheet?.properties.gridProperties?.frozenColumnCount || 0,
    };
  }

  // ============================================
  // BORDERS
  // ============================================

  /**
   * Update cell borders
   */
  async updateBorders(
    spreadsheetId: string,
    range: { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
    borders: {
      top?: { style: string; color?: { red: number; green: number; blue: number } };
      bottom?: { style: string; color?: { red: number; green: number; blue: number } };
      left?: { style: string; color?: { red: number; green: number; blue: number } };
      right?: { style: string; color?: { red: number; green: number; blue: number } };
      innerHorizontal?: { style: string; color?: { red: number; green: number; blue: number } };
      innerVertical?: { style: string; color?: { red: number; green: number; blue: number } };
    }
  ): Promise<void> {
    const styleMap: Record<string, string> = {
      solid: 'SOLID',
      'solid-medium': 'SOLID_MEDIUM',
      'solid-thick': 'SOLID_THICK',
      dashed: 'DASHED',
      dotted: 'DOTTED',
      double: 'DOUBLE',
      none: 'NONE',
    };

    const mapBorder = (b?: { style: string; color?: { red: number; green: number; blue: number } }) => {
      if (!b) return undefined;
      return {
        style: styleMap[b.style] || 'SOLID',
        color: b.color || { red: 0, green: 0, blue: 0 },
      };
    };

    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateBorders: {
            range,
            top: mapBorder(borders.top),
            bottom: mapBorder(borders.bottom),
            left: mapBorder(borders.left),
            right: mapBorder(borders.right),
            innerHorizontal: mapBorder(borders.innerHorizontal),
            innerVertical: mapBorder(borders.innerVertical),
          },
        }],
      }),
    });
  }

  // ============================================
  // AUTO-RESIZE DIMENSIONS
  // ============================================

  /**
   * Auto-resize columns to fit content
   */
  async autoResizeColumns(
    spreadsheetId: string,
    sheetId: number,
    startIndex: number,
    endIndex: number
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex,
              endIndex,
            },
          },
        }],
      }),
    });
  }

  /**
   * Auto-resize rows to fit content
   */
  async autoResizeRows(
    spreadsheetId: string,
    sheetId: number,
    startIndex: number,
    endIndex: number
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex,
            },
          },
        }],
      }),
    });
  }

  /**
   * Set specific dimension size
   */
  async setDimensionSize(
    spreadsheetId: string,
    sheetId: number,
    dimension: 'ROWS' | 'COLUMNS',
    startIndex: number,
    endIndex: number,
    pixelSize: number
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension,
              startIndex,
              endIndex,
            },
            properties: { pixelSize },
            fields: 'pixelSize',
          },
        }],
      }),
    });
  }

  // ============================================
  // HIDE/SHOW ROWS/COLUMNS
  // ============================================

  /**
   * Hide or show rows/columns
   */
  async setDimensionVisibility(
    spreadsheetId: string,
    sheetId: number,
    dimension: 'ROWS' | 'COLUMNS',
    startIndex: number,
    endIndex: number,
    hidden: boolean
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension,
              startIndex,
              endIndex,
            },
            properties: { hiddenByUser: hidden },
            fields: 'hiddenByUser',
          },
        }],
      }),
    });
  }

  // ============================================
  // INSERT/DELETE ROWS/COLUMNS
  // ============================================

  /**
   * Insert rows or columns
   */
  async insertDimension(
    spreadsheetId: string,
    sheetId: number,
    dimension: 'ROWS' | 'COLUMNS',
    startIndex: number,
    endIndex: number,
    inheritFromBefore?: boolean
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          insertDimension: {
            range: {
              sheetId,
              dimension,
              startIndex,
              endIndex,
            },
            inheritFromBefore: inheritFromBefore ?? false,
          },
        }],
      }),
    });
  }

  /**
   * Delete rows or columns
   */
  async deleteDimension(
    spreadsheetId: string,
    sheetId: number,
    dimension: 'ROWS' | 'COLUMNS',
    startIndex: number,
    endIndex: number
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension,
              startIndex,
              endIndex,
            },
          },
        }],
      }),
    });
  }

  // ============================================
  // BASIC FILTER
  // ============================================

  /**
   * Set basic filter on a range
   */
  async setBasicFilter(
    spreadsheetId: string,
    range: { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number }
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          setBasicFilter: {
            filter: { range },
          },
        }],
      }),
    });
  }

  /**
   * Clear basic filter from a sheet
   */
  async clearBasicFilter(spreadsheetId: string, sheetId: number): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          clearBasicFilter: { sheetId },
        }],
      }),
    });
  }

  /**
   * Get basic filter info
   */
  async getBasicFilter(spreadsheetId: string, sheetId: number): Promise<{
    hasFilter: boolean;
    range?: { startRow: number; endRow: number; startCol: number; endCol: number };
  }> {
    const response = await this.request<{
      sheets: Array<{
        properties: { sheetId: number };
        basicFilter?: {
          range: {
            startRowIndex?: number;
            endRowIndex?: number;
            startColumnIndex?: number;
            endColumnIndex?: number;
          };
        };
      }>;
    }>(`/spreadsheets/${spreadsheetId}?fields=sheets(properties.sheetId,basicFilter)`);

    const sheet = response.sheets?.find(s => s.properties.sheetId === sheetId);
    if (!sheet?.basicFilter) {
      return { hasFilter: false };
    }

    const r = sheet.basicFilter.range;
    return {
      hasFilter: true,
      range: {
        startRow: (r.startRowIndex || 0) + 1,
        endRow: r.endRowIndex || 0,
        startCol: (r.startColumnIndex || 0) + 1,
        endCol: r.endColumnIndex || 0,
      },
    };
  }

  // ============================================
  // FILTER VIEWS
  // ============================================

  /**
   * List filter views
   */
  async listFilterViews(spreadsheetId: string): Promise<Array<{
    filterViewId: number;
    title: string;
    range: string;
    sheetId: number;
  }>> {
    const response = await this.request<{
      sheets: Array<{
        properties: { sheetId: number };
        filterViews?: Array<{
          filterViewId: number;
          title: string;
          range: {
            sheetId: number;
            startRowIndex?: number;
            endRowIndex?: number;
            startColumnIndex?: number;
            endColumnIndex?: number;
          };
        }>;
      }>;
    }>(`/spreadsheets/${spreadsheetId}?fields=sheets(properties.sheetId,filterViews)`);

    const colToLetter = (col: number) => {
      let letter = '';
      let temp = col;
      while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
      }
      return letter;
    };

    const views: Array<{
      filterViewId: number;
      title: string;
      range: string;
      sheetId: number;
    }> = [];

    for (const sheet of response.sheets || []) {
      for (const fv of sheet.filterViews || []) {
        const r = fv.range;
        const startCol = colToLetter(r.startColumnIndex || 0);
        const endCol = colToLetter((r.endColumnIndex || 1) - 1);
        const startRow = (r.startRowIndex || 0) + 1;
        const endRow = r.endRowIndex || 1;
        views.push({
          filterViewId: fv.filterViewId,
          title: fv.title,
          range: `${startCol}${startRow}:${endCol}${endRow}`,
          sheetId: r.sheetId,
        });
      }
    }

    return views;
  }

  /**
   * Add a filter view
   */
  async addFilterView(
    spreadsheetId: string,
    title: string,
    range: { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number }
  ): Promise<number> {
    const response = await this.request<{
      replies: Array<{ addFilterView: { filter: { filterViewId: number } } }>;
    }>(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          addFilterView: {
            filter: { title, range },
          },
        }],
      }),
    });
    return response.replies[0].addFilterView.filter.filterViewId;
  }

  /**
   * Delete a filter view
   */
  async deleteFilterView(spreadsheetId: string, filterViewId: number): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteFilterView: { filterId: filterViewId },
        }],
      }),
    });
  }

  // ============================================
  // COPY/PASTE
  // ============================================

  /**
   * Copy and paste a range
   */
  async copyPaste(
    spreadsheetId: string,
    source: { sheetId: number; startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number },
    destination: { sheetId: number; startRowIndex: number; startColumnIndex: number },
    pasteType?: 'PASTE_NORMAL' | 'PASTE_VALUES' | 'PASTE_FORMAT' | 'PASTE_NO_BORDERS' | 'PASTE_FORMULA' | 'PASTE_DATA_VALIDATION' | 'PASTE_CONDITIONAL_FORMATTING'
  ): Promise<void> {
    const numRows = source.endRowIndex - source.startRowIndex;
    const numCols = source.endColumnIndex - source.startColumnIndex;

    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          copyPaste: {
            source,
            destination: {
              sheetId: destination.sheetId,
              startRowIndex: destination.startRowIndex,
              endRowIndex: destination.startRowIndex + numRows,
              startColumnIndex: destination.startColumnIndex,
              endColumnIndex: destination.startColumnIndex + numCols,
            },
            pasteType: pasteType || 'PASTE_NORMAL',
          },
        }],
      }),
    });
  }

  // ============================================
  // ROW/COLUMN GROUPING
  // ============================================

  /**
   * Add a dimension group (for collapsible rows/columns)
   */
  async addDimensionGroup(
    spreadsheetId: string,
    sheetId: number,
    dimension: 'ROWS' | 'COLUMNS',
    startIndex: number,
    endIndex: number
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          addDimensionGroup: {
            range: {
              sheetId,
              dimension,
              startIndex,
              endIndex,
            },
          },
        }],
      }),
    });
  }

  /**
   * Delete a dimension group
   */
  async deleteDimensionGroup(
    spreadsheetId: string,
    sheetId: number,
    dimension: 'ROWS' | 'COLUMNS',
    startIndex: number,
    endIndex: number
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteDimensionGroup: {
            range: {
              sheetId,
              dimension,
              startIndex,
              endIndex,
            },
          },
        }],
      }),
    });
  }

  /**
   * Update dimension group (collapse/expand)
   */
  async updateDimensionGroup(
    spreadsheetId: string,
    sheetId: number,
    dimension: 'ROWS' | 'COLUMNS',
    startIndex: number,
    endIndex: number,
    collapsed: boolean
  ): Promise<void> {
    await this.request(`/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          updateDimensionGroup: {
            dimensionGroup: {
              range: {
                sheetId,
                dimension,
                startIndex,
                endIndex,
              },
              collapsed,
            },
            fields: 'collapsed',
          },
        }],
      }),
    });
  }

  /**
   * List dimension groups
   */
  async listDimensionGroups(spreadsheetId: string, sheetId: number): Promise<{
    rowGroups: Array<{ startIndex: number; endIndex: number; depth: number; collapsed: boolean }>;
    columnGroups: Array<{ startIndex: number; endIndex: number; depth: number; collapsed: boolean }>;
  }> {
    const response = await this.request<{
      sheets: Array<{
        properties: { sheetId: number };
        rowGroups?: Array<{
          range: { startIndex: number; endIndex: number };
          depth: number;
          collapsed?: boolean;
        }>;
        columnGroups?: Array<{
          range: { startIndex: number; endIndex: number };
          depth: number;
          collapsed?: boolean;
        }>;
      }>;
    }>(`/spreadsheets/${spreadsheetId}?fields=sheets(properties.sheetId,rowGroups,columnGroups)`);

    const sheet = response.sheets?.find(s => s.properties.sheetId === sheetId);

    return {
      rowGroups: (sheet?.rowGroups || []).map(g => ({
        startIndex: g.range.startIndex,
        endIndex: g.range.endIndex,
        depth: g.depth,
        collapsed: g.collapsed || false,
      })),
      columnGroups: (sheet?.columnGroups || []).map(g => ({
        startIndex: g.range.startIndex,
        endIndex: g.range.endIndex,
        depth: g.depth,
        collapsed: g.collapsed || false,
      })),
    };
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
