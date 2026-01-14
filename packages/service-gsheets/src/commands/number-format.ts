/**
 * uni gsheets number-format - Set number formats on cells
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

export const numberFormatCommand: Command = {
  name: 'number-format',
  description: 'Set number format on cells (currency, percent, date, etc.)',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell or range (e.g., A1, B1:B100)', required: true },
  ],
  options: [
    { name: 'type', short: 't', type: 'string', description: 'Format type: number, currency, percent, date, time, datetime, text, scientific' },
    { name: 'pattern', short: 'p', type: 'string', description: 'Custom pattern (e.g., "$#,##0.00", "0.00%")' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets number-format ID B1:B100 --type currency',
    'uni gsheets number-format ID C1:C50 --type percent',
    'uni gsheets number-format ID D1:D100 --type date',
    'uni gsheets number-format ID E1:E50 --type number --pattern "#,##0.00"',
    'uni gsheets number-format ID F1:F100 --type currency --pattern "$#,##0.00"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string;
    const formatType = flags.type as string | undefined;
    const pattern = flags.pattern as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (!formatType) {
      output.error('--type is required. Options: number, currency, percent, date, time, datetime, text, scientific');
      return;
    }

    const parsed = parseRange(rangeDef);
    if (!parsed) {
      output.error(`Invalid range: ${rangeDef}`);
      return;
    }

    const typeMap: Record<string, 'TEXT' | 'NUMBER' | 'PERCENT' | 'CURRENCY' | 'DATE' | 'TIME' | 'DATE_TIME' | 'SCIENTIFIC'> = {
      text: 'TEXT',
      number: 'NUMBER',
      percent: 'PERCENT',
      currency: 'CURRENCY',
      date: 'DATE',
      time: 'TIME',
      datetime: 'DATE_TIME',
      scientific: 'SCIENTIFIC',
    };

    const type = typeMap[formatType.toLowerCase()];
    if (!type) {
      output.error(`Unknown format type: ${formatType}`);
      return;
    }

    const spinner = output.spinner(`Setting ${formatType} format on ${rangeDef}...`);

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

      await gsheets.setNumberFormat(
        spreadsheetId,
        {
          sheetId: targetSheet.properties.sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        },
        type,
        pattern
      );

      spinner.success(`Set ${formatType} format on ${rangeDef}`);

      if (globalFlags.json) {
        output.json({ range: rangeDef, type: formatType, pattern });
      }

    } catch (error) {
      spinner.fail('Failed to set number format');
      throw error;
    }
  },
};
