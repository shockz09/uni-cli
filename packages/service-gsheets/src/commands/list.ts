/**
 * uni gsheets list - List recent spreadsheets
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
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
        console.log(c.dim('No spreadsheets found'));
        return;
      }

      console.log('');
      console.log(c.bold('Recent Spreadsheets:'));
      console.log('');

      for (const file of files) {
        const modified = new Date(file.modifiedTime).toLocaleDateString();
        console.log(`  ${c.bold(file.name)}`);
        console.log(`  ${c.dim(`ID: ${file.id} | Modified: ${modified}`)}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch spreadsheets');
      throw error;
    }
  },
};
