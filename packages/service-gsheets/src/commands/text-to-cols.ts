/**
 * uni gsheets text-to-cols - Split text into columns
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

export const textToColsCommand: Command = {
  name: 'text-to-cols',
  description: 'Split text in cells into multiple columns',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Source range (e.g., A1:A100)', required: true },
  ],
  options: [
    { name: 'delimiter', short: 'd', type: 'string', description: 'Delimiter: comma, semicolon, period, space, custom' },
    { name: 'custom', short: 'c', type: 'string', description: 'Custom delimiter string (use with --delimiter custom)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets text-to-cols ID A1:A100 --delimiter comma',
    'uni gsheets text-to-cols ID B1:B50 --delimiter semicolon',
    'uni gsheets text-to-cols ID C1:C20 --delimiter custom --custom "|"',
    'uni gsheets text-to-cols ID A1:A10 --delimiter space',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const delimiter = flags.delimiter as string | undefined;
    const customDelimiter = flags.custom as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (!delimiter) {
      output.error('--delimiter is required. Options: comma, semicolon, period, space, custom');
      return;
    }

    const parsed = parseRange(rangeDef);
    if (!parsed) {
      output.error(`Invalid range: ${rangeDef}`);
      return;
    }

    const delimiterMap: Record<string, 'COMMA' | 'SEMICOLON' | 'PERIOD' | 'SPACE' | 'CUSTOM'> = {
      comma: 'COMMA',
      semicolon: 'SEMICOLON',
      period: 'PERIOD',
      space: 'SPACE',
      custom: 'CUSTOM',
    };

    const delimiterType = delimiterMap[delimiter.toLowerCase()];
    if (!delimiterType) {
      output.error(`Invalid delimiter: ${delimiter}. Use comma, semicolon, period, space, or custom`);
      return;
    }

    if (delimiterType === 'CUSTOM' && !customDelimiter) {
      output.error('--custom is required when using custom delimiter');
      return;
    }

    const spinner = output.spinner(`Splitting text by ${delimiter}...`);

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

      await gsheets.textToColumns(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        delimiterType,
        customDelimiter
      );

      spinner.success(`Split text in ${rangeDef} by ${delimiter}`);

      if (globalFlags.json) {
        output.json({ range: rangeDef, delimiter, customDelimiter });
      }

    } catch (error) {
      spinner.fail('Failed to split text');
      throw error;
    }
  },
};
