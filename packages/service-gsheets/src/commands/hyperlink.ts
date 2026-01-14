/**
 * uni gsheets hyperlink - Add/remove hyperlinks from cells
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

export const hyperlinkCommand: Command = {
  name: 'hyperlink',
  description: 'Add or remove hyperlinks from cells',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell or range (e.g., A1, A1:A10)', required: true },
  ],
  options: [
    { name: 'url', short: 'u', type: 'string', description: 'URL to link to' },
    { name: 'clear', short: 'c', type: 'boolean', description: 'Remove hyperlink' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets hyperlink ID A1 --url "https://example.com"',
    'uni gsheets hyperlink ID B2:B10 --url "https://google.com"',
    'uni gsheets hyperlink ID A1 --clear',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const url = flags.url as string | undefined;
    const clear = flags.clear as boolean;
    const sheetName = flags.sheet as string | undefined;

    if (!url && !clear) {
      output.error('Specify --url to add a link or --clear to remove');
      return;
    }

    const parsed = parseRange(rangeDef);
    if (!parsed) {
      output.error(`Invalid range: ${rangeDef}`);
      return;
    }

    const spinner = output.spinner(clear ? 'Removing hyperlink...' : 'Adding hyperlink...');

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

      const range = {
        sheetId: targetSheet.properties.sheetId,
        startRowIndex: parsed.startRow,
        endRowIndex: parsed.endRow,
        startColumnIndex: parsed.startCol,
        endColumnIndex: parsed.endCol,
      };

      if (clear) {
        await gsheets.clearHyperlink(spreadsheetId, range);
        spinner.success(`Removed hyperlink from ${rangeDef}`);
      } else {
        await gsheets.setHyperlink(spreadsheetId, range, url!);
        spinner.success(`Added hyperlink to ${rangeDef}`);
      }

      if (globalFlags.json) {
        output.json({ range: rangeDef, url: clear ? null : url, cleared: clear });
      }

    } catch (error) {
      spinner.fail('Failed to manage hyperlink');
      throw error;
    }
  },
};
