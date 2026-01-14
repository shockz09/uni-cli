/**
 * uni gsheets hide - Hide or show rows/columns
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

export const hideCommand: Command = {
  name: 'hide',
  description: 'Hide or show rows/columns',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'cols', short: 'c', type: 'string', description: 'Column range to hide/show (e.g., B:D, C)' },
    { name: 'rows', short: 'r', type: 'string', description: 'Row range to hide/show (e.g., 5:10, 3)' },
    { name: 'show', short: 's', type: 'boolean', description: 'Show instead of hide' },
    { name: 'sheet', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets hide ID --cols B:D',
    'uni gsheets hide ID --rows 5:10',
    'uni gsheets hide ID --cols C',
    'uni gsheets hide ID --cols B:D --show',
    'uni gsheets hide ID --rows 5:10 --show',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const colRange = flags.cols as string | undefined;
    const rowRange = flags.rows as string | undefined;
    const showInstead = flags.show as boolean;
    const sheetName = flags.sheet as string | undefined;

    if (!colRange && !rowRange) {
      output.error('Specify --cols or --rows to hide/show');
      return;
    }

    const action = showInstead ? 'Showing' : 'Hiding';
    const spinner = output.spinner(`${action}...`);

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
      const results: string[] = [];
      const hidden = !showInstead;

      // Hide/show columns
      if (colRange) {
        const parsed = parseColRange(colRange);
        if (!parsed) {
          spinner.fail(`Invalid column range: ${colRange}. Use format like B:D or C`);
          return;
        }

        await gsheets.setDimensionVisibility(spreadsheetId, sheetId, 'COLUMNS', parsed.start, parsed.end, hidden);
        results.push(`${showInstead ? 'Showed' : 'Hid'} columns ${colRange}`);
      }

      // Hide/show rows
      if (rowRange) {
        const parsed = parseRowRange(rowRange);
        if (!parsed) {
          spinner.fail(`Invalid row range: ${rowRange}. Use format like 5:10 or 3`);
          return;
        }

        await gsheets.setDimensionVisibility(spreadsheetId, sheetId, 'ROWS', parsed.start, parsed.end, hidden);
        results.push(`${showInstead ? 'Showed' : 'Hid'} rows ${rowRange}`);
      }

      spinner.success(results.join(', '));

      if (globalFlags.json) {
        output.json({
          columns: colRange,
          rows: rowRange,
          hidden,
        });
      }

    } catch (error) {
      spinner.fail(`Failed to ${showInstead ? 'show' : 'hide'}`);
      throw error;
    }
  },
};
