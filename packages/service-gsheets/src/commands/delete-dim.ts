/**
 * uni gsheets delete-rows / delete-cols - Delete rows or columns
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse column range like "A:D" or "A" to indices (0-indexed)
 */
function parseColRange(colRange: string): { start: number; end: number } | null {
  const colToIndex = (col: string) =>
    col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;

  // Range format: A:D
  const rangeMatch = colRange.match(/^([A-Z]+):([A-Z]+)$/i);
  if (rangeMatch) {
    return {
      start: colToIndex(rangeMatch[1].toUpperCase()),
      end: colToIndex(rangeMatch[2].toUpperCase()) + 1,
    };
  }

  // Single column: A
  const singleMatch = colRange.match(/^([A-Z]+)$/i);
  if (singleMatch) {
    const idx = colToIndex(singleMatch[1].toUpperCase());
    return { start: idx, end: idx + 1 };
  }

  return null;
}

/**
 * Parse row range like "1:10" or "5" to indices (0-indexed)
 */
function parseRowRange(rowRange: string): { start: number; end: number } | null {
  // Range format: 1:10
  const rangeMatch = rowRange.match(/^(\d+):(\d+)$/);
  if (rangeMatch) {
    return {
      start: parseInt(rangeMatch[1], 10) - 1,
      end: parseInt(rangeMatch[2], 10),
    };
  }

  // Single row: 5
  const singleMatch = rowRange.match(/^(\d+)$/);
  if (singleMatch) {
    const idx = parseInt(singleMatch[1], 10) - 1;
    return { start: idx, end: idx + 1 };
  }

  return null;
}

export const deleteRowsCommand: Command = {
  name: 'delete-rows',
  description: 'Delete rows from spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Row range to delete (e.g., 5:10, 3)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets delete-rows ID 5',
    'uni gsheets delete-rows ID 5:10',
    'uni gsheets delete-rows ID 100:150 --sheet "Data"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rowRange = args.range as string;
    const sheetName = flags.sheet as string | undefined;

    const parsed = parseRowRange(rowRange);
    if (!parsed) {
      output.error(`Invalid row range: ${rowRange}. Use format like 5:10 or 3`);
      return;
    }

    const spinner = output.spinner(`Deleting rows ${rowRange}...`);

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

      await gsheets.deleteDimension(
        spreadsheetId,
        targetSheet.properties.sheetId,
        'ROWS',
        parsed.start,
        parsed.end
      );

      const count = parsed.end - parsed.start;
      spinner.success(`Deleted ${count} row${count > 1 ? 's' : ''} (${rowRange})`);

      if (globalFlags.json) {
        output.json({ deletedRows: rowRange, count });
      }

    } catch (error) {
      spinner.fail('Failed to delete rows');
      throw error;
    }
  },
};

export const deleteColsCommand: Command = {
  name: 'delete-cols',
  description: 'Delete columns from spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Column range to delete (e.g., B:D, C)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets delete-cols ID B',
    'uni gsheets delete-cols ID B:D',
    'uni gsheets delete-cols ID E:G --sheet "Data"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const colRange = args.range as string;
    const sheetName = flags.sheet as string | undefined;

    const parsed = parseColRange(colRange);
    if (!parsed) {
      output.error(`Invalid column range: ${colRange}. Use format like B:D or C`);
      return;
    }

    const spinner = output.spinner(`Deleting columns ${colRange}...`);

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

      await gsheets.deleteDimension(
        spreadsheetId,
        targetSheet.properties.sheetId,
        'COLUMNS',
        parsed.start,
        parsed.end
      );

      const count = parsed.end - parsed.start;
      spinner.success(`Deleted ${count} column${count > 1 ? 's' : ''} (${colRange})`);

      if (globalFlags.json) {
        output.json({ deletedCols: colRange, count });
      }

    } catch (error) {
      spinner.fail('Failed to delete columns');
      throw error;
    }
  },
};
