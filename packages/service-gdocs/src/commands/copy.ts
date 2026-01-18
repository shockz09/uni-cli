/**
 * uni gdocs copy - Duplicate a document
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const copyCommand: Command = {
  name: 'copy',
  description: 'Duplicate a document',
  args: [
    { name: 'document', description: 'Document ID or URL to copy', required: true },
  ],
  options: [
    { name: 'name', short: 'n', description: 'Name for the copy', type: 'string' },
  ],
  examples: [
    'uni gdocs copy DOC_ID',
    'uni gdocs copy DOC_ID -n "My Copy"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.document as string);
    const name = flags.name as string | undefined;

    const spinner = output.spinner('Copying document...');

    try {
      const newId = await gdocs.copyDocument(documentId, name);
      spinner.stop();

      if (globalFlags.json) {
        output.json({
          documentId: newId,
          url: `https://docs.google.com/document/d/${newId}/edit`
        });
        return;
      }

      output.success('Document copied');
      output.info(`  ID: ${c.cyan(newId)}`);
      output.info(`  URL: ${c.dim(`https://docs.google.com/document/d/${newId}/edit`)}`);
    } catch (error) {
      spinner.fail('Failed to copy document');
      throw error;
    }
  },
};
