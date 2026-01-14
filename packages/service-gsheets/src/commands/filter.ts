/**
 * uni gsheets filter - Basic filter (dropdown filters on columns)
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

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

  return null;
}

function colToLetter(col: number): string {
  let letter = '';
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export const filterCommand: Command = {
  name: 'filter',
  description: 'Set or clear basic filter (dropdown filters)',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Range to filter (e.g., A1:D100)', required: false },
  ],
  options: [
    { name: 'clear', short: 'c', type: 'boolean', description: 'Clear existing filter' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets filter ID A1:D100',
    'uni gsheets filter ID --clear',
    'uni gsheets filter ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rangeDef = args.range as string | undefined;
    const clearFilter = flags.clear as boolean;
    const sheetName = flags.sheet as string | undefined;

    try {
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
        output.error(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      const sheetId = targetSheet.properties.sheetId;

      // If no range and no clear, show current filter status
      if (!rangeDef && !clearFilter) {
        const spinner = output.spinner('Checking filter status...');
        const filterInfo = await gsheets.getBasicFilter(spreadsheetId, sheetId);
        spinner.stop();

        if (globalFlags.json) {
          output.json(filterInfo);
          return;
        }

        console.log('');
        if (filterInfo.hasFilter && filterInfo.range) {
          const r = filterInfo.range;
          const rangeStr = `${colToLetter(r.startCol - 1)}${r.startRow}:${colToLetter(r.endCol - 1)}${r.endRow}`;
          console.log(c.bold('Filter active:'));
          console.log(`  Range: ${rangeStr}`);
        } else {
          console.log(c.dim('No filter active on this sheet'));
        }
        console.log('');
        return;
      }

      // Clear filter
      if (clearFilter) {
        const spinner = output.spinner('Clearing filter...');
        await gsheets.clearBasicFilter(spreadsheetId, sheetId);
        spinner.success('Cleared filter');

        if (globalFlags.json) {
          output.json({ cleared: true });
        }
        return;
      }

      // Set filter
      if (rangeDef) {
        const parsed = parseRange(rangeDef);
        if (!parsed) {
          output.error(`Invalid range format: ${rangeDef}. Use format like A1:D100`);
          return;
        }

        const spinner = output.spinner(`Setting filter on ${rangeDef}...`);
        await gsheets.setBasicFilter(spreadsheetId, {
          sheetId,
          startRowIndex: parsed.startRow,
          endRowIndex: parsed.endRow,
          startColumnIndex: parsed.startCol,
          endColumnIndex: parsed.endCol,
        });
        spinner.success(`Set filter on ${rangeDef}`);

        if (globalFlags.json) {
          output.json({ range: rangeDef });
        }
      }

    } catch (error) {
      output.error('Failed to manage filter');
      throw error;
    }
  },
};
