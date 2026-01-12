/**
 * uni gsheets find - Find and optionally replace text
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Convert column index to letter (0 = A, 1 = B, etc.)
 */
function colToLetter(col: number): string {
  let letter = '';
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export const findCommand: Command = {
  name: 'find',
  description: 'Find text in spreadsheet, optionally replace',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'search', description: 'Text to search for', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
    { name: 'range', short: 'r', type: 'string', description: 'Range to search (default: all)' },
    { name: 'replace', type: 'string', description: 'Replace matches with this text' },
    { name: 'case', type: 'boolean', description: 'Case-sensitive search' },
    { name: 'whole', type: 'boolean', description: 'Match whole cell only' },
  ],
  examples: [
    'uni gsheets find ID "old text"',
    'uni gsheets find ID "error" --sheet "Logs"',
    'uni gsheets find ID "old" --replace "new"',
    'uni gsheets find ID "TODO" --case --whole',
    'uni gsheets find ID "2024" --range A1:A100 --replace "2025"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const searchText = args.search as string;
    const sheetName = flags.sheet as string | undefined;
    const rangeArg = flags.range as string | undefined;
    const replaceText = flags.replace as string | undefined;
    const caseSensitive = flags.case as boolean;
    const wholeCell = flags.whole as boolean;

    const isReplace = replaceText !== undefined;
    const spinner = output.spinner(isReplace ? 'Finding and replacing...' : 'Searching...');

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

      // Build range
      const range = rangeArg
        ? (rangeArg.includes('!') ? rangeArg : `${targetSheet.properties.title}!${rangeArg}`)
        : `${targetSheet.properties.title}!A1:ZZ10000`;

      // Get data
      const values = await gsheets.getValues(spreadsheetId, range);

      if (values.length === 0) {
        spinner.fail('No data in range');
        return;
      }

      // Find matches
      const matches: { cell: string; row: number; col: number; value: string }[] = [];
      const newValues: string[][] = [];

      // Parse start position from range
      const rangeMatch = range.match(/!([A-Z]+)(\d+)/i);
      const startCol = rangeMatch ? rangeMatch[1].toUpperCase().charCodeAt(0) - 65 : 0;
      const startRow = rangeMatch ? parseInt(rangeMatch[2], 10) : 1;

      for (let r = 0; r < values.length; r++) {
        const newRow: string[] = [];
        for (let c = 0; c < values[r].length; c++) {
          let cellValue = values[r][c] || '';
          const compareValue = caseSensitive ? cellValue : cellValue.toLowerCase();
          const compareSearch = caseSensitive ? searchText : searchText.toLowerCase();

          const isMatch = wholeCell
            ? compareValue === compareSearch
            : compareValue.includes(compareSearch);

          if (isMatch) {
            const cellRef = `${colToLetter(startCol + c)}${startRow + r}`;
            matches.push({ cell: cellRef, row: startRow + r, col: startCol + c, value: cellValue });

            if (isReplace) {
              if (wholeCell) {
                cellValue = replaceText;
              } else {
                const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
                cellValue = cellValue.replace(regex, replaceText);
              }
            }
          }
          newRow.push(cellValue);
        }
        newValues.push(newRow);
      }

      // Write back if replacing
      if (isReplace && matches.length > 0) {
        await gsheets.setValues(spreadsheetId, range, newValues);
      }

      spinner.stop();

      output.pipe(`${matches.length}`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          search: searchText,
          replace: replaceText,
          matches: matches.length,
          cells: matches.map(m => m.cell),
        });
        return;
      }

      console.log('');
      if (matches.length === 0) {
        console.log(c.dim(`No matches found for "${searchText}"`));
      } else {
        console.log(c.bold(`Found ${matches.length} match${matches.length === 1 ? '' : 'es'}${isReplace ? ' (replaced)' : ''}:`));
        console.log('');
        for (const match of matches.slice(0, 20)) {
          const preview = match.value.length > 50 ? match.value.slice(0, 47) + '...' : match.value;
          console.log(`  ${c.cyan(match.cell)}: ${preview}`);
        }
        if (matches.length > 20) {
          console.log(c.dim(`  ... and ${matches.length - 20} more`));
        }
      }
      console.log('');
    } catch (error) {
      spinner.fail(isReplace ? 'Failed to find and replace' : 'Failed to search');
      throw error;
    }
  },
};
