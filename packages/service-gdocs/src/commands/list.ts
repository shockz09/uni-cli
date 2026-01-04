/**
 * uni gdocs list - List recent documents
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
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
        console.log(c.dim('No documents found'));
        return;
      }

      console.log('');
      console.log(c.bold('Recent Documents:'));
      console.log('');

      for (const file of files) {
        const modified = new Date(file.modifiedTime).toLocaleDateString();
        console.log(`  ${c.bold(file.name)}`);
        console.log(`  ${c.dim(`ID: ${file.id} | Modified: ${modified}`)}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch documents');
      throw error;
    }
  },
};
