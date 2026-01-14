/**
 * uni gsheets resize - Auto-resize or manually resize rows/columns
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

export const resizeCommand: Command = {
  name: 'resize',
  description: 'Auto-resize or manually set row/column sizes',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'cols', short: 'c', type: 'string', description: 'Column range to resize (e.g., A:D, A)' },
    { name: 'rows', short: 'r', type: 'string', description: 'Row range to resize (e.g., 1:10, 5)' },
    { name: 'size', short: 'p', type: 'string', description: 'Pixel size (if not specified, auto-fit to content)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets resize ID --cols A:D',
    'uni gsheets resize ID --cols A:Z',
    'uni gsheets resize ID --rows 1:10',
    'uni gsheets resize ID --cols B --size 200',
    'uni gsheets resize ID --rows 1:5 --size 50',
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
    const sizeStr = flags.size as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (!colRange && !rowRange) {
      output.error('Specify --cols or --rows to resize');
      return;
    }

    const spinner = output.spinner('Resizing...');

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

      // Resize columns
      if (colRange) {
        const parsed = parseColRange(colRange);
        if (!parsed) {
          spinner.fail(`Invalid column range: ${colRange}. Use format like A:D or A`);
          return;
        }

        if (sizeStr) {
          const size = parseInt(sizeStr, 10);
          await gsheets.setDimensionSize(spreadsheetId, sheetId, 'COLUMNS', parsed.start, parsed.end, size);
          results.push(`Set columns ${colRange} to ${size}px`);
        } else {
          await gsheets.autoResizeColumns(spreadsheetId, sheetId, parsed.start, parsed.end);
          results.push(`Auto-resized columns ${colRange}`);
        }
      }

      // Resize rows
      if (rowRange) {
        const parsed = parseRowRange(rowRange);
        if (!parsed) {
          spinner.fail(`Invalid row range: ${rowRange}. Use format like 1:10 or 5`);
          return;
        }

        if (sizeStr) {
          const size = parseInt(sizeStr, 10);
          await gsheets.setDimensionSize(spreadsheetId, sheetId, 'ROWS', parsed.start, parsed.end, size);
          results.push(`Set rows ${rowRange} to ${size}px`);
        } else {
          await gsheets.autoResizeRows(spreadsheetId, sheetId, parsed.start, parsed.end);
          results.push(`Auto-resized rows ${rowRange}`);
        }
      }

      spinner.success(results.join(', '));

      if (globalFlags.json) {
        output.json({
          columns: colRange,
          rows: rowRange,
          size: sizeStr ? parseInt(sizeStr, 10) : 'auto',
        });
      }

    } catch (error) {
      spinner.fail('Failed to resize');
      throw error;
    }
  },
};
