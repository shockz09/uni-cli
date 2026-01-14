/**
 * uni gsheets wrap - Set text wrapping strategy
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

export const wrapCommand: Command = {
  name: 'wrap',
  description: 'Set text wrapping strategy for cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell or range (e.g., A1, A1:D10)', required: true },
  ],
  options: [
    { name: 'strategy', short: 't', type: 'string', description: 'Wrap strategy: wrap, overflow, clip' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets wrap ID A1:D100 --strategy wrap',
    'uni gsheets wrap ID B2:B50 --strategy clip',
    'uni gsheets wrap ID C1:C10 --strategy overflow',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const strategy = flags.strategy as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (!strategy) {
      output.error('--strategy is required. Options: wrap, overflow, clip');
      return;
    }

    const parsed = parseRange(rangeDef);
    if (!parsed) {
      output.error(`Invalid range: ${rangeDef}`);
      return;
    }

    const strategyMap: Record<string, 'OVERFLOW_CELL' | 'CLIP' | 'WRAP'> = {
      wrap: 'WRAP',
      overflow: 'OVERFLOW_CELL',
      clip: 'CLIP',
    };

    const mappedStrategy = strategyMap[strategy.toLowerCase()];
    if (!mappedStrategy) {
      output.error(`Invalid strategy: ${strategy}. Use wrap, overflow, or clip`);
      return;
    }

    const spinner = output.spinner(`Setting wrap strategy on ${rangeDef}...`);

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

      await gsheets.setWrapStrategy(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        mappedStrategy
      );

      spinner.success(`Set ${strategy} wrapping on ${rangeDef}`);

      if (globalFlags.json) {
        output.json({ range: rangeDef, strategy });
      }

    } catch (error) {
      spinner.fail('Failed to set wrap strategy');
      throw error;
    }
  },
};
