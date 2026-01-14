/**
 * uni gsheets insert - Insert rows or columns
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse column to index (0-indexed)
 */
function parseCol(col: string): number | null {
  const match = col.match(/^([A-Z]+)$/i);
  if (!match) return null;
  return match[1].split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

export const insertCommand: Command = {
  name: 'insert',
  description: 'Insert rows or columns',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'rows', short: 'r', type: 'string', description: 'Row number to insert at (1-indexed)' },
    { name: 'cols', short: 'c', type: 'string', description: 'Column letter to insert at (e.g., B)' },
    { name: 'count', short: 'n', type: 'string', description: 'Number of rows/columns to insert (default: 1)' },
    { name: 'inherit', short: 'i', type: 'boolean', description: 'Inherit formatting from row/column before' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets insert ID --rows 5',
    'uni gsheets insert ID --rows 5 --count 3',
    'uni gsheets insert ID --cols B',
    'uni gsheets insert ID --cols C --count 2',
    'uni gsheets insert ID --rows 10 --inherit',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rowAt = flags.rows as string | undefined;
    const colAt = flags.cols as string | undefined;
    const count = parseInt(flags.count as string || '1', 10);
    const inherit = flags.inherit as boolean;
    const sheetName = flags.sheet as string | undefined;

    if (!rowAt && !colAt) {
      output.error('Specify --rows or --cols to insert');
      return;
    }

    if (rowAt && colAt) {
      output.error('Specify either --rows or --cols, not both');
      return;
    }

    const spinner = output.spinner('Inserting...');

    try {
      // Get sheet info
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

      if (rowAt) {
        const rowIndex = parseInt(rowAt, 10) - 1;
        if (isNaN(rowIndex) || rowIndex < 0) {
          spinner.fail(`Invalid row number: ${rowAt}`);
          return;
        }

        await gsheets.insertDimension(spreadsheetId, sheetId, 'ROWS', rowIndex, rowIndex + count, inherit);
        spinner.success(`Inserted ${count} row${count > 1 ? 's' : ''} at row ${rowAt}`);

        if (globalFlags.json) {
          output.json({ type: 'rows', at: parseInt(rowAt, 10), count });
        }
      }

      if (colAt) {
        const colIndex = parseCol(colAt);
        if (colIndex === null) {
          spinner.fail(`Invalid column: ${colAt}`);
          return;
        }

        await gsheets.insertDimension(spreadsheetId, sheetId, 'COLUMNS', colIndex, colIndex + count, inherit);
        spinner.success(`Inserted ${count} column${count > 1 ? 's' : ''} at column ${colAt}`);

        if (globalFlags.json) {
          output.json({ type: 'columns', at: colAt, count });
        }
      }

    } catch (error) {
      spinner.fail('Failed to insert');
      throw error;
    }
  },
};
