/**
 * uni gsheets rotate - Rotate text in cells
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

export const rotateCommand: Command = {
  name: 'rotate',
  description: 'Rotate text in cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell or range (e.g., A1, A1:Z1)', required: true },
  ],
  options: [
    { name: 'angle', short: 'a', type: 'string', description: 'Rotation angle (-90 to 90 degrees)' },
    { name: 'vertical', short: 'v', type: 'boolean', description: 'Stack text vertically' },
    { name: 'clear', short: 'c', type: 'boolean', description: 'Clear rotation (reset to 0)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets rotate ID A1:Z1 --angle 45',
    'uni gsheets rotate ID A1:A10 --angle -90',
    'uni gsheets rotate ID B1:B5 --vertical',
    'uni gsheets rotate ID A1:Z1 --clear',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const angleStr = flags.angle as string | undefined;
    const vertical = flags.vertical as boolean;
    const clear = flags.clear as boolean;
    const sheetName = flags.sheet as string | undefined;

    if (!angleStr && !vertical && !clear) {
      output.error('Specify --angle, --vertical, or --clear');
      return;
    }

    const parsed = parseRange(rangeDef);
    if (!parsed) {
      output.error(`Invalid range: ${rangeDef}`);
      return;
    }

    let angle: number | undefined;
    if (angleStr) {
      angle = parseInt(angleStr, 10);
      if (isNaN(angle) || angle < -90 || angle > 90) {
        output.error('Angle must be between -90 and 90 degrees');
        return;
      }
    }

    const spinner = output.spinner(`Setting text rotation on ${rangeDef}...`);

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

      await gsheets.setTextRotation(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        clear ? 0 : angle,
        vertical
      );

      if (clear) {
        spinner.success(`Cleared rotation on ${rangeDef}`);
      } else if (vertical) {
        spinner.success(`Set vertical text on ${rangeDef}`);
      } else {
        spinner.success(`Rotated text ${angle}° on ${rangeDef}`);
      }

      if (globalFlags.json) {
        output.json({ range: rangeDef, angle: clear ? 0 : angle, vertical });
      }

    } catch (error) {
      spinner.fail('Failed to set text rotation');
      throw error;
    }
  },
};
