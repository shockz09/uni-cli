/**
 * uni gsheets sort - Sort data in a range
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse column letter to index (A = 0, B = 1, etc.)
 */
function letterToCol(letter: string): number {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return col - 1;
}

/**
 * Parse A1 notation range
 */
function parseRange(range: string): { startRow: number; endRow: number; startCol: number; endCol: number } {
  const cellPart = range.includes('!') ? range.split('!')[1] : range;
  const match = cellPart.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (!match) throw new Error(`Invalid range: ${range}`);

  return {
    startCol: letterToCol(match[1].toUpperCase()),
    startRow: parseInt(match[2], 10) - 1,
    endCol: letterToCol(match[3].toUpperCase()) + 1,
    endRow: parseInt(match[4], 10),
  };
}

export const sortCommand: Command = {
  name: 'sort',
  description: 'Sort data in a range by column',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Range to sort (e.g., A1:D100)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'col', short: 'c', type: 'string', description: 'Column to sort by (e.g., B). Default: first column' },
    { name: 'desc', type: 'boolean', description: 'Sort descending (default: ascending)' },
    { name: 'header', type: 'boolean', description: 'First row is header (exclude from sort)' },
  ],
  examples: [
    'uni gsheets sort ID A1:D100 --col B',
    'uni gsheets sort ID A1:Z50 --col C --desc',
    'uni gsheets sort ID A1:D100 --col B --header',
    'uni gsheets sort ID --sheet "Data" A1:E200 --col A',
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
    const sortColStr = flags.col as string | undefined;
    const descending = flags.desc as boolean;
    const hasHeader = flags.header as boolean;

    const spinner = output.spinner('Sorting data...');

    try {
      // Get spreadsheet info
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
      const sortCol = sortColStr ? letterToCol(sortColStr.toUpperCase()) : range.startCol;

      // Adjust range if header row
      const sortRange = {
        sheetId: targetSheet.properties.sheetId,
        startRowIndex: hasHeader ? range.startRow + 1 : range.startRow,
        endRowIndex: range.endRow,
        startColumnIndex: range.startCol,
        endColumnIndex: range.endCol,
      };

      // Sort via batchUpdate
      await gsheets.sortRange(spreadsheetId, sortRange, sortCol, descending);

      spinner.success(`Sorted by column ${sortColStr || 'A'} (${descending ? 'descending' : 'ascending'})`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          range: rangeStr,
          sortColumn: sortColStr || 'A',
          order: descending ? 'descending' : 'ascending',
          hasHeader,
          success: true,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log(`${c.green('Sorted:')} ${rangeStr} by column ${sortColStr || 'A'}`);
        console.log(c.dim(`Order: ${descending ? 'descending' : 'ascending'}${hasHeader ? ', header excluded' : ''}`));
      }
    } catch (error) {
      spinner.fail('Failed to sort data');
      throw error;
    }
  },
};
