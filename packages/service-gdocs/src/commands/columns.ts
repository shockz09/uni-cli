/**
 * uni gdocs columns - Set column layout for a section
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const columnsCommand: Command = {
  name: 'columns',
  description: 'Set column layout for a document section',
  args: [
    { name: 'document', description: 'Document ID or URL', required: true },
    { name: 'count', description: 'Number of columns (1-3)', required: true },
  ],
  options: [
    { name: 'at', short: 'a', description: 'Section start index (default: 1)', type: 'number' },
    { name: 'gap', short: 'g', description: 'Gap between columns in points (default: 36)', type: 'number' },
  ],
  examples: [
    'uni gdocs columns DOC_ID 2',
    'uni gdocs columns DOC_ID 3 --gap 24',
    'uni gdocs columns DOC_ID 1',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.document as string);
    const count = parseInt(args.count as string, 10);
    const sectionIndex = (flags.at as number) || 1;
    const gap = (flags.gap as number) || 36;

    if (isNaN(count) || count < 1 || count > 3) {
      output.error('Column count must be 1, 2, or 3');
      return;
    }

    const spinner = output.spinner('Updating column layout...');

    try {
      await gdocs.updateSectionColumns(documentId, sectionIndex, count, gap);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ success: true, columns: count, gap, sectionIndex });
        return;
      }

      output.success(`Column layout set to ${c.cyan(count.toString())} column${count > 1 ? 's' : ''}`);
      if (count > 1) {
        output.info(`  Gap: ${c.dim(gap + 'pt')}`);
      }
    } catch (error) {
      spinner.fail('Failed to update columns');
      throw error;
    }
  },
};
