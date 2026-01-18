/**
 * uni gdocs footnote - Insert a footnote
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const footnoteCommand: Command = {
  name: 'footnote',
  description: 'Insert a footnote at a position',
  args: [
    { name: 'document', description: 'Document ID or URL', required: true },
    { name: 'position', description: 'Character index to insert footnote', required: true },
  ],
  examples: [
    'uni gdocs footnote DOC_ID 150',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.document as string);
    const position = parseInt(args.position as string, 10);

    if (isNaN(position)) {
      output.error('Position must be a number');
      return;
    }

    const spinner = output.spinner('Inserting footnote...');

    try {
      const footnoteId = await gdocs.insertFootnote(documentId, position);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ footnoteId, position });
        return;
      }

      output.success('Footnote inserted');
      output.info(`  ID: ${c.dim(footnoteId)}`);
    } catch (error) {
      spinner.fail('Failed to insert footnote');
      throw error;
    }
  },
};
