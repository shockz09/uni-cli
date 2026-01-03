/**
 * uni gdocs replace - Replace text in document
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const replaceCommand: Command = {
  name: 'replace',
  description: 'Replace text in document',
  args: [
    {
      name: 'id',
      description: 'Document ID or URL',
      required: true,
    },
    {
      name: 'old',
      description: 'Text to find',
      required: true,
    },
    {
      name: 'new',
      description: 'Replacement text',
      required: true,
    },
  ],
  examples: [
    'uni gdocs replace 1abc123XYZ "old text" "new text"',
    'uni gdocs replace 1abc123XYZ "TODO" "DONE"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const oldText = args.old as string;
    const newText = args.new as string;

    const spinner = output.spinner('Replacing text...');

    try {
      const count = await gdocs.replaceText(documentId, oldText, newText);

      spinner.success(`Replaced ${count} occurrence(s)`);

      if (globalFlags.json) {
        output.json({
          documentId,
          oldText,
          newText,
          replacements: count,
        });
        return;
      }

      console.log('');
      console.log(`\x1b[32mReplaced ${count} occurrence(s)\x1b[0m`);
      console.log(`  "${oldText}" → "${newText}"`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to replace text');
      throw error;
    }
  },
};
