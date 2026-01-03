/**
 * uni gdocs list - List recent documents
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List recent documents',
  aliases: ['ls'],
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Max documents to show',
      default: 10,
    },
  ],
  examples: ['uni gdocs list', 'uni gdocs list --limit 20'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching documents...');

    try {
      const limit = (flags.limit as number) || 10;
      const files = await gdocs.listDocuments(limit);

      spinner.success(`Found ${files.length} document(s)`);

      if (globalFlags.json) {
        output.json(files);
        return;
      }

      if (files.length === 0) {
        output.info('No documents found');
        return;
      }

      console.log('');
      console.log('\x1b[1mRecent Documents:\x1b[0m');
      console.log('');

      for (const file of files) {
        const modified = new Date(file.modifiedTime).toLocaleDateString();
        console.log(`  \x1b[1m${file.name}\x1b[0m`);
        console.log(`  \x1b[90mID: ${file.id} | Modified: ${modified}\x1b[0m`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch documents');
      throw error;
    }
  },
};
