/**
 * uni gsheets create - Create a new spreadsheet
 */

import type { Command, CommandContext } from '@uni/shared';
import { gsheets } from '../api';

export const createCommand: Command = {
  name: 'create',
  description: 'Create a new spreadsheet',
  args: [
    {
      name: 'title',
      description: 'Spreadsheet title',
      required: true,
    },
  ],
  examples: [
    'uni gsheets create "Budget 2025"',
    'uni gsheets create "Project Tracker"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const title = args.title as string;

    const spinner = output.spinner(`Creating spreadsheet "${title}"...`);

    try {
      const spreadsheet = await gsheets.createSpreadsheet(title);

      spinner.success('Spreadsheet created');

      if (globalFlags.json) {
        output.json({
          id: spreadsheet.spreadsheetId,
          name: spreadsheet.properties.title,
          url: spreadsheet.spreadsheetUrl,
        });
        return;
      }

      console.log('');
      console.log(`\x1b[32mCreated:\x1b[0m ${spreadsheet.spreadsheetUrl}`);
      console.log(`\x1b[1mSpreadsheet:\x1b[0m ${spreadsheet.properties.title}`);
      console.log(`\x1b[90mID: ${spreadsheet.spreadsheetId}\x1b[0m`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to create spreadsheet');
      throw error;
    }
  },
};
