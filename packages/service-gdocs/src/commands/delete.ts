/**
 * uni gdocs delete - Delete a document
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a document (moves to trash)',
  args: [{ name: 'id', description: 'Document ID or URL', required: true }],
  options: [
    { name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation' },
  ],
  examples: [
    'uni gdocs delete 1abc123XYZ',
    'uni gdocs delete 1abc123XYZ --force',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);

    // Get document info first
    const doc = await gdocs.getDocument(documentId);
    const title = doc.title;

    if (!flags.force && !output.isPiped()) {
      console.log(`${c.yellow('Warning:')} About to delete "${title}"`);
      console.log(c.dim('Use --force to skip this warning'));
    }

    const spinner = output.spinner(`Deleting document...`);

    try {
      await gdocs.deleteDocument(documentId);
      spinner.success(`Deleted "${title}"`);

      if (globalFlags.json) {
        output.json({ documentId, title, deleted: true });
      }
    } catch (error) {
      spinner.fail('Failed to delete document');
      throw error;
    }
  },
};
