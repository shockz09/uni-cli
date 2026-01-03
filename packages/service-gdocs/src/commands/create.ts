/**
 * uni gdocs create - Create a new document
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs } from '../api';

export const createCommand: Command = {
  name: 'create',
  description: 'Create a new document',
  args: [
    {
      name: 'title',
      description: 'Document title',
      required: true,
    },
  ],
  examples: ['uni gdocs create "Meeting Notes"', 'uni gdocs create "Project Plan"'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const title = args.title as string;

    const spinner = output.spinner(`Creating document "${title}"...`);

    try {
      const doc = await gdocs.createDocument(title);

      spinner.success('Document created');

      if (globalFlags.json) {
        output.json({
          id: doc.documentId,
          title: doc.title,
          url: `https://docs.google.com/document/d/${doc.documentId}/edit`,
        });
        return;
      }

      console.log('');
      console.log(`\x1b[32mCreated:\x1b[0m https://docs.google.com/document/d/${doc.documentId}/edit`);
      console.log(`\x1b[1mDocument:\x1b[0m ${doc.title}`);
      console.log(`\x1b[90mID: ${doc.documentId}\x1b[0m`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to create document');
      throw error;
    }
  },
};
