/**
 * uni gdocs rename - Rename a document
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const renameCommand: Command = {
  name: 'rename',
  description: 'Rename a document',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'title', description: 'New title', required: true },
  ],
  examples: [
    'uni gdocs rename 1abc123XYZ "New Title"',
    'uni gdocs rename 1abc123XYZ "Meeting Notes - Q1"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const newTitle = args.title as string;

    const spinner = output.spinner(`Renaming document...`);

    try {
      await gdocs.renameDocument(documentId, newTitle);
      spinner.success(`Renamed to "${newTitle}"`);

      if (globalFlags.json) {
        output.json({ documentId, title: newTitle, renamed: true });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Document:')} ${newTitle}`);
        console.log(c.dim(`https://docs.google.com/document/d/${documentId}/edit`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to rename document');
      throw error;
    }
  },
};
