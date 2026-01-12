/**
 * uni gsheets rename - Rename a spreadsheet
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const renameCommand: Command = {
  name: 'rename',
  description: 'Rename a spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'newName', description: 'New name for the spreadsheet', required: true },
  ],
  options: [],
  examples: [
    'uni gsheets rename 1abc123XYZ "New Name"',
    'uni gsheets rename 1abc123XYZ "Budget 2025"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const newName = args.newName as string;

    const spinner = output.spinner(`Renaming spreadsheet...`);

    try {
      // Get current name
      const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
      const oldName = spreadsheet.properties.title;

      // Rename via batchUpdate
      await gsheets.renameSpreadsheet(spreadsheetId, newName);

      output.pipe(newName);
      spinner.success(`Renamed "${oldName}" to "${newName}"`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          oldName,
          newName,
          success: true,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log(`${c.green('Renamed:')} ${oldName} → ${newName}`);
      }
    } catch (error) {
      spinner.fail('Failed to rename spreadsheet');
      throw error;
    }
  },
};
