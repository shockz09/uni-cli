/**
 * uni gdocs stats - Get document statistics
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const statsCommand: Command = {
  name: 'stats',
  description: 'Get document statistics (words, characters, pages)',
  args: [
    { name: 'document', description: 'Document ID or URL', required: true },
  ],
  examples: [
    'uni gdocs stats DOC_ID',
    'uni gdocs stats "https://docs.google.com/document/d/DOC_ID/edit"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.document as string);
    const spinner = output.spinner('Getting document statistics...');

    try {
      const stats = await gdocs.getStats(documentId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(stats);
        return;
      }

      output.info('');
      output.info(c.bold('Document Statistics'));
      output.info(`  Words:      ${c.cyan(stats.words.toLocaleString())}`);
      output.info(`  Characters: ${c.cyan(stats.characters.toLocaleString())}`);
      output.info(`  Paragraphs: ${c.cyan(stats.paragraphs.toLocaleString())}`);
      output.info(`  Pages:      ${c.cyan(stats.pages.toLocaleString())} (estimated)`);
      output.info('');
    } catch (error) {
      spinner.fail('Failed to get statistics');
      throw error;
    }
  },
};
