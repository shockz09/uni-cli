/**
 * uni gsheets delete - Delete a spreadsheet
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a spreadsheet (moves to trash)',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation' },
  ],
  examples: [
    'uni gsheets delete 1abc123XYZ',
    'uni gsheets delete 1abc123XYZ --force',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const force = flags.force as boolean;

    // Get spreadsheet info first
    const spinner = output.spinner('Fetching spreadsheet...');
    let spreadsheetName: string;

    try {
      const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
      spreadsheetName = spreadsheet.properties.title;
      spinner.stop();
    } catch (error) {
      spinner.fail('Failed to fetch spreadsheet');
      throw error;
    }

    // Confirm deletion unless --force
    if (!force && !output.isPiped()) {
      console.log(`\n${c.yellow('Warning:')} This will delete "${spreadsheetName}"`);
      console.log(c.dim('Use --force to skip this confirmation\n'));
      // In non-interactive mode, we just warn and proceed
    }

    const deleteSpinner = output.spinner(`Deleting "${spreadsheetName}"...`);

    try {
      await gsheets.deleteSpreadsheet(spreadsheetId);

      deleteSpinner.success(`Deleted "${spreadsheetName}"`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          name: spreadsheetName,
          deleted: true,
        });
        return;
      }
    } catch (error) {
      deleteSpinner.fail('Failed to delete spreadsheet');
      throw error;
    }
  },
};
