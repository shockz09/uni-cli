/**
 * uni gdocs page-break - Insert page breaks
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const pageBreakCommand: Command = {
  name: 'page-break',
  description: 'Insert a page break',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
  ],
  options: [
    { name: 'at', type: 'string', description: 'Insert position (index). Default: end of document' },
  ],
  examples: [
    'uni gdocs page-break ID',
    'uni gdocs page-break ID --at 100',
    'uni gdocs page-break ID --at 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const at = flags.at ? parseInt(flags.at as string, 10) : undefined;

    if (flags.at && isNaN(at!)) {
      output.error('Position must be a number');
      return;
    }

    const spinner = output.spinner('Inserting page break...');

    try {
      await gdocs.insertPageBreak(documentId, at);
      spinner.success(at ? `Inserted page break at position ${at}` : 'Inserted page break at end');

      if (globalFlags.json) {
        output.json({ at: at || 'end' });
      }
    } catch (error) {
      spinner.fail('Failed to insert page break');
      throw error;
    }
  },
};
