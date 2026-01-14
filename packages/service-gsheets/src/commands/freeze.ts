/**
 * uni gsheets freeze - Freeze rows and columns
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const freezeCommand: Command = {
  name: 'freeze',
  description: 'Freeze rows and/or columns',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'rows', short: 'r', type: 'string', description: 'Number of rows to freeze' },
    { name: 'cols', short: 'c', type: 'string', description: 'Number of columns to freeze' },
    { name: 'clear', type: 'boolean', description: 'Unfreeze all rows and columns' },
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets freeze ID --rows 1',
    'uni gsheets freeze ID --cols 2',
    'uni gsheets freeze ID --rows 1 --cols 1',
    'uni gsheets freeze ID --clear',
    'uni gsheets freeze ID --sheet "Data" --rows 2',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const rows = flags.rows !== undefined ? parseInt(flags.rows as string, 10) : undefined;
    const cols = flags.cols !== undefined ? parseInt(flags.cols as string, 10) : undefined;
    const clearFreeze = flags.clear as boolean;
    const sheetName = flags.sheet as string | undefined;

    const spinner = output.spinner(clearFreeze ? 'Unfreezing...' : 'Freezing...');

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
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      // If no flags provided, show current state
      if (!clearFreeze && rows === undefined && cols === undefined) {
        spinner.stop();
        const grid = targetSheet.properties.gridProperties;
        const frozenRows = grid?.frozenRowCount || 0;
        const frozenCols = grid?.frozenColumnCount || 0;

        if (globalFlags.json) {
          output.json({ frozenRows, frozenCols, sheet: targetSheet.properties.title });
          return;
        }

        console.log('');
        console.log(c.bold(`Freeze state for "${targetSheet.properties.title}":`));
        console.log(`  Frozen rows: ${frozenRows}`);
        console.log(`  Frozen columns: ${frozenCols}`);
        console.log('');
        return;
      }

      // Clear or set freeze
      const frozenRowCount = clearFreeze ? 0 : rows;
      const frozenColumnCount = clearFreeze ? 0 : cols;

      await gsheets.freezeRowsColumns(
        spreadsheetId,
        targetSheet.properties.sheetId,
        frozenRowCount,
        frozenColumnCount
      );

      if (clearFreeze) {
        spinner.success('Unfroze all rows and columns');
      } else {
        const parts = [];
        if (frozenRowCount !== undefined) parts.push(`${frozenRowCount} row${frozenRowCount !== 1 ? 's' : ''}`);
        if (frozenColumnCount !== undefined) parts.push(`${frozenColumnCount} column${frozenColumnCount !== 1 ? 's' : ''}`);
        spinner.success(`Froze ${parts.join(' and ')}`);
      }

      if (globalFlags.json) {
        output.json({
          frozenRows: clearFreeze ? 0 : (frozenRowCount ?? (targetSheet.properties.gridProperties?.frozenRowCount || 0)),
          frozenCols: clearFreeze ? 0 : (frozenColumnCount ?? (targetSheet.properties.gridProperties?.frozenColumnCount || 0)),
          sheet: targetSheet.properties.title,
        });
      }

    } catch (error) {
      spinner.fail('Failed to freeze');
      throw error;
    }
  },
};
