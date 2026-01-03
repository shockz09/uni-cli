/**
 * uni gsheets list - List recent spreadsheets
 */

import type { Command, CommandContext } from '@uni/shared';
import { gsheets } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List recent spreadsheets',
  aliases: ['ls'],
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Max spreadsheets to show',
      default: 10,
    },
  ],
  examples: [
    'uni gsheets list',
    'uni gsheets list --limit 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching spreadsheets...');

    try {
      const limit = (flags.limit as number) || 10;
      const files = await gsheets.listSpreadsheets(limit);

      spinner.success(`Found ${files.length} spreadsheet(s)`);

      if (globalFlags.json) {
        output.json(files);
        return;
      }

      if (files.length === 0) {
        output.info('No spreadsheets found');
        return;
      }

      console.log('');
      console.log('\x1b[1mRecent Spreadsheets:\x1b[0m');
      console.log('');

      for (const file of files) {
        const modified = new Date(file.modifiedTime).toLocaleDateString();
        console.log(`  \x1b[1m${file.name}\x1b[0m`);
        console.log(`  \x1b[90mID: ${file.id} | Modified: ${modified}\x1b[0m`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch spreadsheets');
      throw error;
    }
  },
};
