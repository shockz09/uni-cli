/**
 * uni gsheets autofill - Auto-fill cells based on pattern
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

export const autofillCommand: Command = {
  name: 'autofill',
  description: 'Auto-fill cells based on a pattern (like dragging fill handle)',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'source', description: 'Source range with pattern (e.g., A1:A2)', required: true },
  ],
  options: [
    { name: 'count', short: 'n', type: 'string', description: 'Number of cells to fill' },
    { name: 'direction', short: 'd', type: 'string', description: 'Direction: down, right (default: down)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets autofill ID A1:A2 --count 10',
    'uni gsheets autofill ID A1:B1 --count 5 --direction right',
    'uni gsheets autofill ID A1:A3 --count 100 --direction down',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const sourceDef = args.source as string;
    const countStr = flags.count as string | undefined;
    const direction = (flags.direction as string | undefined) || 'down';
    const sheetName = flags.sheet as string | undefined;

    if (!countStr) {
      output.error('--count is required');
      return;
    }

    const count = parseInt(countStr, 10);
    if (isNaN(count) || count <= 0) {
      output.error('Count must be a positive number');
      return;
    }

    const parsed = parseRange(sourceDef);
    if (!parsed) {
      output.error(`Invalid source range: ${sourceDef}`);
      return;
    }

    const dimension = direction.toLowerCase() === 'right' ? 'COLUMNS' : 'ROWS';

    const spinner = output.spinner(`Auto-filling ${count} cells ${direction}...`);

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

      await gsheets.autoFill(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        count,
        dimension
      );

      spinner.success(`Auto-filled ${count} cells ${direction} from ${sourceDef}`);

      if (globalFlags.json) {
        output.json({ source: sourceDef, count, direction });
      }

    } catch (error) {
      spinner.fail('Failed to auto-fill');
      throw error;
    }
  },
};
