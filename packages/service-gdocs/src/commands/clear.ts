/**
 * uni gdocs clear - Clear document content
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const clearCommand: Command = {
  name: 'clear',
  description: 'Clear all content from document',
  args: [{ name: 'id', description: 'Document ID or URL', required: true }],
  options: [
    { name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation' },
  ],
  examples: [
    'uni gdocs clear 1abc123XYZ',
    'uni gdocs clear 1abc123XYZ --force',
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
      console.log(`${c.yellow('Warning:')} About to clear all content from "${title}"`);
      console.log(c.dim('Use --force to skip this warning'));
    }

    const spinner = output.spinner(`Clearing document...`);

    try {
      await gdocs.clearContent(documentId);
      spinner.success(`Cleared "${title}"`);

      if (globalFlags.json) {
        output.json({ documentId, title, cleared: true });
      }
    } catch (error) {
      spinner.fail('Failed to clear document');
      throw error;
    }
  },
};
