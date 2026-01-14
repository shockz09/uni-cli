/**
 * uni gsheets copy-paste - Copy and paste ranges
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse cell reference to grid coordinates (0-indexed)
 */
function parseRange(ref: string): {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
} | null {
  const colToIndex = (col: string) =>
    col.split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1;

  // Try range format: A1:B5
  const rangeMatch = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (rangeMatch) {
    return {
      startCol: colToIndex(rangeMatch[1].toUpperCase()),
      startRow: parseInt(rangeMatch[2], 10) - 1,
      endCol: colToIndex(rangeMatch[3].toUpperCase()) + 1,
      endRow: parseInt(rangeMatch[4], 10),
    };
  }

  return null;
}

/**
 * Parse single cell reference to coordinates (0-indexed)
 */
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

export const copyPasteCommand: Command = {
  name: 'copy-paste',
  description: 'Copy and paste a range to another location',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'source', description: 'Source range (e.g., A1:B10)', required: true },
    { name: 'dest', description: 'Destination cell (e.g., D1)', required: true },
  ],
  options: [
    { name: 'type', short: 't', type: 'string', description: 'Paste type: normal, values, format, formula, validation, conditional' },
    { name: 'sheet', short: 's', type: 'string', description: 'Source sheet name (default: first sheet)' },
    { name: 'dest-sheet', type: 'string', description: 'Destination sheet name (default: same as source)' },
  ],
  examples: [
    'uni gsheets copy-paste ID A1:B10 D1',
    'uni gsheets copy-paste ID A1:C5 A10 --type values',
    'uni gsheets copy-paste ID A1:D10 A1 --sheet "Sheet1" --dest-sheet "Sheet2"',
    'uni gsheets copy-paste ID B2:E5 G2 --type format',
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
    const pasteType = flags.type as string | undefined;
    const sheetName = flags.sheet as string | undefined;
    const destSheetName = flags['dest-sheet'] as string | undefined;

    // Parse source range
    const sourceParsed = parseRange(sourceRange);
    if (!sourceParsed) {
      output.error(`Invalid source range: ${sourceRange}. Use format like A1:B10`);
      return;
    }

    // Parse destination cell
    const destParsed = parseCell(destCell);
    if (!destParsed) {
      output.error(`Invalid destination cell: ${destCell}. Use format like D1`);
      return;
    }

    const spinner = output.spinner(`Copying ${sourceRange} to ${destCell}...`);

    try {
      // Get sheet info
      const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
      const sheets = [...(spreadsheet.sheets || [])].sort((a, b) => {
        const indexA = a.properties.index ?? (a.properties.sheetId === 0 ? 0 : 999);
        const indexB = b.properties.index ?? (b.properties.sheetId === 0 ? 0 : 999);
        return indexA - indexB;
      });

      // Find source sheet
      const sourceSheet = sheetName
        ? sheets.find(s => s.properties.title.toLowerCase() === sheetName.toLowerCase())
        : sheets[0];

      if (!sourceSheet) {
        spinner.fail(sheetName ? `Source sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      // Find destination sheet
      const destSheet = destSheetName
        ? sheets.find(s => s.properties.title.toLowerCase() === destSheetName.toLowerCase())
        : sourceSheet;

      if (!destSheet) {
        spinner.fail(`Destination sheet "${destSheetName}" not found`);
        return;
      }

      // Map paste type
      const typeMap: Record<string, string> = {
        normal: 'PASTE_NORMAL',
        values: 'PASTE_VALUES',
        format: 'PASTE_FORMAT',
        formula: 'PASTE_FORMULA',
        validation: 'PASTE_DATA_VALIDATION',
        conditional: 'PASTE_CONDITIONAL_FORMATTING',
      };
      const mappedType = pasteType ? (typeMap[pasteType] || 'PASTE_NORMAL') : undefined;

      await gsheets.copyPaste(
        spreadsheetId,
        {
          sheetId: sourceSheet.properties.sheetId,
          startRowIndex: sourceParsed.startRow,
          endRowIndex: sourceParsed.endRow,
          startColumnIndex: sourceParsed.startCol,
          endColumnIndex: sourceParsed.endCol,
        },
        {
          sheetId: destSheet.properties.sheetId,
          startRowIndex: destParsed.row,
          startColumnIndex: destParsed.col,
        },
        mappedType as Parameters<typeof gsheets.copyPaste>[3]
      );

      const destSheetInfo = destSheetName ? ` on "${destSheet.properties.title}"` : '';
      spinner.success(`Copied ${sourceRange} to ${destCell}${destSheetInfo}`);

      if (globalFlags.json) {
        output.json({
          source: sourceRange,
          destination: destCell,
          sourceSheet: sourceSheet.properties.title,
          destSheet: destSheet.properties.title,
          pasteType: pasteType || 'normal',
        });
      }

    } catch (error) {
      spinner.fail('Failed to copy-paste');
      throw error;
    }
  },
};
