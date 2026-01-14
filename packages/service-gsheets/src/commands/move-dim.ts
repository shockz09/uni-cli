/**
 * uni gsheets move-dim - Move rows or columns
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const moveDimCommand: Command = {
  name: 'move-dim',
  description: 'Move rows or columns to a new position',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'rows', short: 'r', type: 'boolean', description: 'Move rows' },
    { name: 'cols', short: 'c', type: 'boolean', description: 'Move columns' },
    { name: 'start', type: 'string', description: 'Start index (1-based, e.g., 5 for row 5 or column E)' },
    { name: 'end', type: 'string', description: 'End index (1-based, inclusive)' },
    { name: 'to', type: 'string', description: 'Destination index (1-based)' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets move-dim ID --rows --start 5 --end 7 --to 2',
    'uni gsheets move-dim ID --cols --start 3 --end 3 --to 1',
    'uni gsheets move-dim ID --rows --start 10 --end 15 --to 1 --sheet "Data"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const moveRows = flags.rows as boolean;
    const moveCols = flags.cols as boolean;
    const startStr = flags.start as string | undefined;
    const endStr = flags.end as string | undefined;
    const toStr = flags.to as string | undefined;
    const sheetName = flags.sheet as string | undefined;

    if (!moveRows && !moveCols) {
      output.error('Specify --rows or --cols');
      return;
    }

    if (moveRows && moveCols) {
      output.error('Specify only one of --rows or --cols');
      return;
    }

    if (!startStr || !endStr || !toStr) {
      output.error('--start, --end, and --to are required');
      return;
    }

    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    const to = parseInt(toStr, 10);

    if (isNaN(start) || isNaN(end) || isNaN(to)) {
      output.error('Start, end, and to must be numbers');
      return;
    }

    if (start < 1 || end < 1 || to < 1) {
      output.error('Indices must be 1 or greater');
      return;
    }

    if (end < start) {
      output.error('End must be >= start');
      return;
    }

    const dimension = moveRows ? 'ROWS' : 'COLUMNS';
    const dimName = moveRows ? 'row' : 'column';
    const spinner = output.spinner(`Moving ${dimName}s ${start}-${end} to position ${to}...`);

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

      // Convert 1-based to 0-based indices
      await gsheets.moveDimension(
        spreadsheetId,
        targetSheet.properties.sheetId,
        dimension,
        start - 1,
        end,
        to - 1
      );

      spinner.success(`Moved ${dimName}s ${start}-${end} to position ${to}`);

      if (globalFlags.json) {
        output.json({ dimension: dimName, start, end, to });
      }

    } catch (error) {
      spinner.fail(`Failed to move ${dimName}s`);
      throw error;
    }
  },
};
