/**
 * uni gsheets format - Apply formatting to cells
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse A1 notation range into row/column indices
 * e.g., "A1:C5" -> { startRowIndex: 0, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 3 }
 */
function parseRange(range: string): { startRowIndex: number; endRowIndex: number; startColumnIndex: number; endColumnIndex: number } {
  // Remove sheet name if present
  const cellPart = range.includes('!') ? range.split('!')[1] : range;

  const match = cellPart.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i);
  if (!match) {
    throw new Error(`Invalid range: ${range}`);
  }

  const colToIndex = (col: string) => {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
  };

  const startCol = colToIndex(match[1].toUpperCase());
  const startRow = parseInt(match[2], 10) - 1;
  const endCol = match[3] ? colToIndex(match[3].toUpperCase()) + 1 : startCol + 1;
  const endRow = match[4] ? parseInt(match[4], 10) : startRow + 1;

  return {
    startRowIndex: startRow,
    endRowIndex: endRow,
    startColumnIndex: startCol,
    endColumnIndex: endCol,
  };
}

/**
 * Parse color string (hex or name) to RGB object
 */
function parseColor(color: string): { red: number; green: number; blue: number } {
  const colors: Record<string, string> = {
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    yellow: '#ffff00',
    orange: '#ffa500',
    purple: '#800080',
    white: '#ffffff',
    black: '#000000',
    gray: '#808080',
    grey: '#808080',
  };

  const hex = colors[color.toLowerCase()] || color;
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) {
    throw new Error(`Invalid color: ${color}`);
  }

  return {
    red: parseInt(match[1], 16) / 255,
    green: parseInt(match[2], 16) / 255,
    blue: parseInt(match[3], 16) / 255,
  };
}

export const formatCommand: Command = {
  name: 'format',
  description: 'Apply formatting to cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell range (e.g., A1:B10)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'bold', short: 'b', type: 'boolean', description: 'Make text bold' },
    { name: 'italic', short: 'i', type: 'boolean', description: 'Make text italic' },
    { name: 'size', type: 'string', description: 'Font size (e.g., 12)' },
    { name: 'bg', type: 'string', description: 'Background color (name or hex)' },
    { name: 'color', short: 'c', type: 'string', description: 'Text color (name or hex)' },
    { name: 'header-row', type: 'boolean', description: 'Format first row as header (bold, blue bg, white text)' },
    { name: 'alternating', type: 'boolean', description: 'Apply alternating row colors (zebra striping)' },
  ],
  examples: [
    'uni gsheets format ID A1:B1 --bold',
    'uni gsheets format ID A1:C10 --bg yellow',
    'uni gsheets format ID D1:D100 --color red --italic',
    'uni gsheets format ID A1 --bold --size 14 --bg "#4285f4" --color white',
    'uni gsheets format ID A1:D20 --header-row --alternating',
    'uni gsheets format ID A1:Z100 --header-row',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeStr = args.range as string;
    const sheetName = flags.sheet as string | undefined;

    // Check format options
    const hasBold = flags.bold !== undefined;
    const hasItalic = flags.italic !== undefined;
    const hasSize = flags.size !== undefined;
    const hasBg = flags.bg !== undefined;
    const hasColor = flags.color !== undefined;
    const hasHeaderRow = flags['header-row'] as boolean;
    const hasAlternating = flags.alternating as boolean;

    const hasManualFormat = hasBold || hasItalic || hasSize || hasBg || hasColor;
    const hasAutoFormat = hasHeaderRow || hasAlternating;

    if (!hasManualFormat && !hasAutoFormat) {
      output.error('At least one format option required (--bold, --italic, --size, --bg, --color, --header-row, --alternating)');
      return;
    }

    const spinner = output.spinner(`Formatting ${rangeStr}...`);

    try {
      // Get sheet ID (sort by index, fallback to sheetId 0 = first created)
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

      // Parse range
      const range = parseRange(rangeStr);
      const sheetId = targetSheet.properties.sheetId;

      const applied: string[] = [];

      // Apply header row formatting
      if (hasHeaderRow) {
        const headerRange = {
          ...range,
          endRowIndex: range.startRowIndex + 1,
        };
        await gsheets.formatCells(spreadsheetId, sheetId, headerRange, {
          bold: true,
          backgroundColor: { red: 0.26, green: 0.52, blue: 0.96 },
          textColor: { red: 1, green: 1, blue: 1 },
        });
        applied.push('header row');
      }

      // Apply alternating colors (zebra striping)
      if (hasAlternating) {
        await gsheets.addAlternatingColors(spreadsheetId, sheetId, range);
        applied.push('alternating colors');
      }

      // Apply manual formatting
      if (hasManualFormat) {
        const format: {
          bold?: boolean;
          italic?: boolean;
          fontSize?: number;
          backgroundColor?: { red: number; green: number; blue: number };
          textColor?: { red: number; green: number; blue: number };
        } = {};

        if (hasBold) { format.bold = Boolean(flags.bold); applied.push('bold'); }
        if (hasItalic) { format.italic = Boolean(flags.italic); applied.push('italic'); }
        if (hasSize) { format.fontSize = parseInt(flags.size as string, 10); applied.push(`size ${flags.size}`); }
        if (hasBg) { format.backgroundColor = parseColor(flags.bg as string); applied.push(`bg: ${flags.bg}`); }
        if (hasColor) { format.textColor = parseColor(flags.color as string); applied.push(`color: ${flags.color}`); }

        await gsheets.formatCells(spreadsheetId, sheetId, range, format);
      }

      spinner.success(`Formatted ${rangeStr}`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          range: rangeStr,
          sheetId,
          applied,
          success: true,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Applied:')} ${applied.join(', ')} to ${rangeStr}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to format cells');
      throw error;
    }
  },
};
