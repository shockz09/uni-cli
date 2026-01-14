/**
 * uni gsheets pivot - Create pivot tables
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

function parseRange(ref: string): {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
} | null {
  const colToIndex = (col: string) =>
    col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;

  const match = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (!match) return null;

  return {
    startCol: colToIndex(match[1].toUpperCase()),
    startRow: parseInt(match[2], 10) - 1,
    endCol: colToIndex(match[3].toUpperCase()) + 1,
    endRow: parseInt(match[4], 10),
  };
}

function parseCell(ref: string): { row: number; col: number } | null {
  const colToIndex = (col: string) =>
    col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;

  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;

  return {
    col: colToIndex(match[1].toUpperCase()),
    row: parseInt(match[2], 10) - 1,
  };
}

export const pivotCommand: Command = {
  name: 'pivot',
  description: 'Create a pivot table',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'source', description: 'Source data range (e.g., A1:E100)', required: true },
    { name: 'dest', description: 'Destination cell (e.g., G1)', required: true },
  ],
  options: [
    { name: 'rows', short: 'r', type: 'string', description: 'Row grouping columns (0-indexed, comma-separated)' },
    { name: 'cols', short: 'c', type: 'string', description: 'Column grouping columns (0-indexed, comma-separated)' },
    { name: 'values', short: 'v', type: 'string', description: 'Value columns with function (e.g., "2:SUM,3:AVERAGE")' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets pivot ID A1:E100 G1 --rows 0 --values "2:SUM"',
    'uni gsheets pivot ID A1:D50 F1 --rows 0,1 --cols 2 --values "3:SUM"',
    'uni gsheets pivot ID A1:E100 G1 --rows 0 --values "2:COUNT,3:AVERAGE"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const sourceRange = args.source as string;
    const destCell = args.dest as string;
    const rowsStr = flags.rows as string | undefined;
    const colsStr = flags.cols as string | undefined;
    const valuesStr = flags.values as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    const sourceParsed = parseRange(sourceRange);
    if (!sourceParsed) {
      output.error(`Invalid source range: ${sourceRange}`);
      return;
    }

    const destParsed = parseCell(destCell);
    if (!destParsed) {
      output.error(`Invalid destination cell: ${destCell}`);
      return;
    }

    if (!valuesStr) {
      output.error('--values is required (e.g., "2:SUM")');
      return;
    }

    const spinner = output.spinner('Creating pivot table...');

    try {
      const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
      const sheets = [...(spreadsheet.sheets || [])].sort((a, b) => {
        const indexA = a.properties.index ?? (a.properties.sheetId === 0 ? 0 : 999);
        const indexB = b.properties.index ?? (b.properties.sheetId === 0 ? 0 : 999);
        return indexA - indexB;
      });
      const targetSheet = sheetName
        ? sheets.find(s => s.properties.title.toLowerCase() === sheetName.toLowerCase())
        : sheets[0];

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const sheetId = targetSheet.properties.sheetId;

      // Parse rows
      const rows = rowsStr
        ? rowsStr.split(',').map(r => ({ sourceColumnOffset: parseInt(r.trim(), 10) }))
        : [];

      // Parse columns
      const columns = colsStr
        ? colsStr.split(',').map(c => ({ sourceColumnOffset: parseInt(c.trim(), 10) }))
        : [];

      // Parse values (format: "col:FUNC,col:FUNC")
      const funcMap: Record<string, 'SUM' | 'COUNT' | 'AVERAGE' | 'MAX' | 'MIN' | 'COUNTA' | 'COUNTUNIQUE' | 'MEDIAN' | 'STDEV' | 'VAR'> = {
        SUM: 'SUM', COUNT: 'COUNT', AVERAGE: 'AVERAGE', AVG: 'AVERAGE',
        MAX: 'MAX', MIN: 'MIN', COUNTA: 'COUNTA', COUNTUNIQUE: 'COUNTUNIQUE',
        MEDIAN: 'MEDIAN', STDEV: 'STDEV', VAR: 'VAR',
      };

      const values = valuesStr.split(',').map(v => {
        const [col, func] = v.trim().split(':');
        return {
          sourceColumnOffset: parseInt(col, 10),
          summarizeFunction: funcMap[func?.toUpperCase() || 'SUM'] || 'SUM',
        };
      });

      await gsheets.createPivotTable(
        spreadsheetId,
        {
          sheetId,
          startRowIndex: sourceParsed.startRow,
          endRowIndex: sourceParsed.endRow,
          startColumnIndex: sourceParsed.startCol,
          endColumnIndex: sourceParsed.endCol,
        },
        { sheetId, rowIndex: destParsed.row, columnIndex: destParsed.col },
        rows,
        columns,
        values
      );

      spinner.success(`Created pivot table at ${destCell}`);

      if (globalFlags.json) {
        output.json({ source: sourceRange, destination: destCell, rows: rows.length, columns: columns.length, values: values.length });
      }

    } catch (error) {
      spinner.fail('Failed to create pivot table');
      throw error;
    }
  },
};
