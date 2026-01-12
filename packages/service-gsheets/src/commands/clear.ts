/**
 * uni gsheets clear - Clear cell values in a range
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const clearCommand: Command = {
  name: 'clear',
  description: 'Clear cell values in a range (keeps formatting)',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Cell range to clear (e.g., A1:Z100)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets clear ID A1:Z100',
    'uni gsheets clear ID B2:D50 --sheet "Data"',
    'uni gsheets clear ID A:A',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    let range = args.range as string;
    const sheetName = flags.sheet as string | undefined;

    const spinner = output.spinner(`Clearing ${range}...`);

    try {
      // Get sheet info to prepend sheet name
      const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
      const sheets = spreadsheet.sheets || [];

      // Sort by index to get the actual first sheet
      // sheetId 0 is always the first sheet created, use as fallback
      const sortedSheets = [...sheets].sort((a, b) => {
        const indexA = a.properties.index ?? (a.properties.sheetId === 0 ? 0 : 999);
        const indexB = b.properties.index ?? (b.properties.sheetId === 0 ? 0 : 999);
        return indexA - indexB;
      });
      const targetSheet = sheetName
        ? sortedSheets.find(s => s.properties.title.toLowerCase() === sheetName.toLowerCase())
        : sortedSheets[0];

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      // Prepend sheet name if not included
      if (!range.includes('!')) {
        range = `${targetSheet.properties.title}!${range}`;
      }

      await gsheets.clearValues(spreadsheetId, range);

      spinner.success(`Cleared ${range}`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          range,
          cleared: true,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log(`${c.green('Cleared:')} ${range}`);
      }
    } catch (error) {
      spinner.fail('Failed to clear range');
      throw error;
    }
  },
};
