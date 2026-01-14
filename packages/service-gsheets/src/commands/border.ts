/**
 * uni gsheets border - Set cell borders
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse color from name or hex
 */
function parseColor(color: string): { red: number; green: number; blue: number } {
  const colors: Record<string, { red: number; green: number; blue: number }> = {
    black: { red: 0, green: 0, blue: 0 },
    white: { red: 1, green: 1, blue: 1 },
    red: { red: 0.96, green: 0.26, blue: 0.21 },
    green: { red: 0.26, green: 0.65, blue: 0.45 },
    blue: { red: 0.26, green: 0.52, blue: 0.96 },
    yellow: { red: 1, green: 0.92, blue: 0.23 },
    orange: { red: 1, green: 0.6, blue: 0 },
    purple: { red: 0.61, green: 0.15, blue: 0.69 },
    gray: { red: 0.62, green: 0.62, blue: 0.62 },
    grey: { red: 0.62, green: 0.62, blue: 0.62 },
    cyan: { red: 0, green: 0.74, blue: 0.83 },
    pink: { red: 0.91, green: 0.12, blue: 0.39 },
  };

  const lower = color.toLowerCase();
  if (colors[lower]) return colors[lower];

  // Try hex color
  const hex = color.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      red: parseInt(hex.slice(0, 2), 16) / 255,
      green: parseInt(hex.slice(2, 4), 16) / 255,
      blue: parseInt(hex.slice(4, 6), 16) / 255,
    };
  }

  return { red: 0, green: 0, blue: 0 };
}

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

  // Try single cell format: A1
  const cellMatch = ref.match(/^([A-Z]+)(\d+)$/i);
  if (cellMatch) {
    const col = colToIndex(cellMatch[1].toUpperCase());
    const row = parseInt(cellMatch[2], 10) - 1;
    return {
      startCol: col,
      startRow: row,
      endCol: col + 1,
      endRow: row + 1,
    };
  }

  return null;
}

export const borderCommand: Command = {
  name: 'border',
  description: 'Set cell borders',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell range (e.g., A1:D10)', required: true },
  ],
  options: [
    { name: 'all', short: 'a', type: 'boolean', description: 'Apply border to all sides and inner lines' },
    { name: 'outer', short: 'o', type: 'boolean', description: 'Apply border to outer edges only' },
    { name: 'inner', short: 'i', type: 'boolean', description: 'Apply border to inner lines only' },
    { name: 'top', type: 'boolean', description: 'Apply border to top' },
    { name: 'bottom', type: 'boolean', description: 'Apply border to bottom' },
    { name: 'left', type: 'boolean', description: 'Apply border to left' },
    { name: 'right', type: 'boolean', description: 'Apply border to right' },
    { name: 'style', short: 's', type: 'string', description: 'Border style: solid, solid-medium, solid-thick, dashed, dotted, double' },
    { name: 'color', short: 'c', type: 'string', description: 'Border color (name or hex)' },
    { name: 'clear', type: 'boolean', description: 'Clear all borders' },
    { name: 'sheet', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets border ID A1:D10 --all',
    'uni gsheets border ID A1:D10 --all --style solid-thick --color blue',
    'uni gsheets border ID A1:D10 --outer --style double',
    'uni gsheets border ID A1:D10 --inner --style dashed --color gray',
    'uni gsheets border ID A1:D10 --top --bottom --style solid',
    'uni gsheets border ID A1:D10 --clear',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const sheetName = flags.sheet as string | undefined;

    const all = flags.all as boolean;
    const outer = flags.outer as boolean;
    const inner = flags.inner as boolean;
    const top = flags.top as boolean;
    const bottom = flags.bottom as boolean;
    const left = flags.left as boolean;
    const right = flags.right as boolean;
    const style = (flags.style as string) || 'solid';
    const colorStr = flags.color as string | undefined;
    const clearBorders = flags.clear as boolean;

    const spinner = output.spinner(clearBorders ? 'Clearing borders...' : 'Setting borders...');

    try {
      // Parse range
      const parsed = parseRange(rangeDef);
      if (!parsed) {
        spinner.fail(`Invalid range format: ${rangeDef}`);
        return;
      }

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

      // Parse color
      const color = colorStr ? parseColor(colorStr) : { red: 0, green: 0, blue: 0 };

      const range = {
        sheetId: targetSheet.properties.sheetId,
        startRowIndex: parsed.startRow,
        endRowIndex: parsed.endRow,
        startColumnIndex: parsed.startCol,
        endColumnIndex: parsed.endCol,
      };

      // Build borders object
      const borders: Parameters<typeof gsheets.updateBorders>[2] = {};

      if (clearBorders) {
        // Clear all borders
        borders.top = { style: 'none' };
        borders.bottom = { style: 'none' };
        borders.left = { style: 'none' };
        borders.right = { style: 'none' };
        borders.innerHorizontal = { style: 'none' };
        borders.innerVertical = { style: 'none' };
      } else {
        const borderSpec = { style, color };

        if (all) {
          borders.top = borderSpec;
          borders.bottom = borderSpec;
          borders.left = borderSpec;
          borders.right = borderSpec;
          borders.innerHorizontal = borderSpec;
          borders.innerVertical = borderSpec;
        } else if (outer) {
          borders.top = borderSpec;
          borders.bottom = borderSpec;
          borders.left = borderSpec;
          borders.right = borderSpec;
        } else if (inner) {
          borders.innerHorizontal = borderSpec;
          borders.innerVertical = borderSpec;
        } else {
          // Individual sides
          if (top) borders.top = borderSpec;
          if (bottom) borders.bottom = borderSpec;
          if (left) borders.left = borderSpec;
          if (right) borders.right = borderSpec;
        }
      }

      // Check if any border was specified
      if (!clearBorders && Object.keys(borders).length === 0) {
        spinner.fail('Specify --all, --outer, --inner, or individual sides (--top, --bottom, --left, --right)');
        return;
      }

      await gsheets.updateBorders(spreadsheetId, range, borders);

      if (clearBorders) {
        spinner.success(`Cleared borders from ${rangeDef}`);
      } else {
        const sides = Object.keys(borders).length;
        spinner.success(`Applied ${style} borders to ${rangeDef}`);
      }

      if (globalFlags.json) {
        output.json({
          range: rangeDef,
          cleared: clearBorders,
          style: clearBorders ? undefined : style,
          color: clearBorders ? undefined : colorStr,
        });
      }

    } catch (error) {
      spinner.fail('Failed to set borders');
      throw error;
    }
  },
};
