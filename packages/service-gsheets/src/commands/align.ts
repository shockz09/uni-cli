/**
 * uni gsheets align - Set text alignment in cells
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

  const rangeMatch = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (rangeMatch) {
    return {
      startCol: colToIndex(rangeMatch[1].toUpperCase()),
      startRow: parseInt(rangeMatch[2], 10) - 1,
      endCol: colToIndex(rangeMatch[3].toUpperCase()) + 1,
      endRow: parseInt(rangeMatch[4], 10),
    };
  }

  const cellMatch = ref.match(/^([A-Z]+)(\d+)$/i);
  if (cellMatch) {
    const col = colToIndex(cellMatch[1].toUpperCase());
    const row = parseInt(cellMatch[2], 10) - 1;
    return { startCol: col, startRow: row, endCol: col + 1, endRow: row + 1 };
  }

  return null;
}

export const alignCommand: Command = {
  name: 'align',
  description: 'Set text alignment in cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell or range (e.g., A1, A1:D10)', required: true },
  ],
  options: [
    { name: 'horizontal', short: 'h', type: 'string', description: 'Horizontal alignment: left, center, right' },
    { name: 'vertical', short: 'v', type: 'string', description: 'Vertical alignment: top, middle, bottom' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets align ID A1:D10 --horizontal center',
    'uni gsheets align ID B1:B100 --vertical middle',
    'uni gsheets align ID A1:Z1 --horizontal center --vertical middle',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const horizontal = flags.horizontal as string | undefined;
    const vertical = flags.vertical as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (!horizontal && !vertical) {
      output.error('Specify --horizontal and/or --vertical alignment');
      return;
    }

    const parsed = parseRange(rangeDef);
    if (!parsed) {
      output.error(`Invalid range: ${rangeDef}`);
      return;
    }

    const hMap: Record<string, 'LEFT' | 'CENTER' | 'RIGHT'> = {
      left: 'LEFT', center: 'CENTER', right: 'RIGHT',
    };
    const vMap: Record<string, 'TOP' | 'MIDDLE' | 'BOTTOM'> = {
      top: 'TOP', middle: 'MIDDLE', bottom: 'BOTTOM',
    };

    const h = horizontal ? hMap[horizontal.toLowerCase()] : undefined;
    const v = vertical ? vMap[vertical.toLowerCase()] : undefined;

    if (horizontal && !h) {
      output.error(`Invalid horizontal alignment: ${horizontal}`);
      return;
    }
    if (vertical && !v) {
      output.error(`Invalid vertical alignment: ${vertical}`);
      return;
    }

    const spinner = output.spinner(`Setting alignment on ${rangeDef}...`);

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

      await gsheets.setAlignment(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        h,
        v
      );

      const parts = [];
      if (h) parts.push(`horizontal: ${horizontal}`);
      if (v) parts.push(`vertical: ${vertical}`);
      spinner.success(`Set alignment (${parts.join(', ')}) on ${rangeDef}`);

      if (globalFlags.json) {
        output.json({ range: rangeDef, horizontal: h, vertical: v });
      }

    } catch (error) {
      spinner.fail('Failed to set alignment');
      throw error;
    }
  },
};
