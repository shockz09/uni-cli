/**
 * uni gdocs bookmark - Create or delete named ranges (bookmarks)
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const bookmarkCommand: Command = {
  name: 'bookmark',
  description: 'Create or delete named ranges (bookmarks)',
  args: [
    { name: 'action', description: 'create or delete', required: true },
    { name: 'document', description: 'Document ID or URL', required: true },
  ],
  options: [
    { name: 'name', short: 'n', description: 'Bookmark name (for create)', type: 'string' },
    { name: 'start', short: 's', description: 'Start index (for create)', type: 'number' },
    { name: 'end', short: 'e', description: 'End index (for create)', type: 'number' },
    { name: 'id', description: 'Named range ID (for delete)', type: 'string' },
  ],
  examples: [
    'uni gdocs bookmark create DOC_ID -n "Chapter 1" -s 100 -e 500',
    'uni gdocs bookmark delete DOC_ID --id RANGE_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const action = args.action as string;
    const documentId = extractDocumentId(args.document as string);

    if (action === 'create') {
      const name = flags.name as string;
      const start = flags.start as number;
      const end = flags.end as number;

      if (!name || start === undefined || end === undefined) {
        output.error('Name (-n), start (-s), and end (-e) are required for create');
        return;
      }

      const spinner = output.spinner('Creating bookmark...');
      try {
        const rangeId = await gdocs.createNamedRange(documentId, name, start, end);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ namedRangeId: rangeId, name, start, end });
          return;
        }

        output.success(`Bookmark "${name}" created`);
        output.info(`  ID: ${c.dim(rangeId)}`);
      } catch (error) {
        spinner.fail('Failed to create bookmark');
        throw error;
      }
    } else if (action === 'delete') {
      const rangeId = flags.id as string;
      if (!rangeId) {
        output.error('Named range ID is required. Use --id RANGE_ID');
        return;
      }

      const spinner = output.spinner('Deleting bookmark...');
      try {
        await gdocs.deleteNamedRange(documentId, rangeId);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ success: true, namedRangeId: rangeId });
          return;
        }

        output.success('Bookmark deleted');
      } catch (error) {
        spinner.fail('Failed to delete bookmark');
        throw error;
      }
    } else {
      output.error('Action must be: create or delete');
    }
  },
};
