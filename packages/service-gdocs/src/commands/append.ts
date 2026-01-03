/**
 * uni gdocs append - Append text to document
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const appendCommand: Command = {
  name: 'append',
  description: 'Append text to document',
  args: [
    {
      name: 'id',
      description: 'Document ID or URL',
      required: true,
    },
    {
      name: 'text',
      description: 'Text to append',
      required: true,
    },
  ],
  examples: [
    'uni gdocs append 1abc123XYZ "New paragraph"',
    'uni gdocs append 1abc123XYZ "\\n\\nAction Items:\\n- Task 1\\n- Task 2"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    // Handle escaped newlines
    const text = (args.text as string).replace(/\\n/g, '\n');

    const spinner = output.spinner('Appending text...');

    try {
      await gdocs.appendText(documentId, text);

      spinner.success('Text appended');

      if (globalFlags.json) {
        output.json({
          documentId,
          appended: text,
          success: true,
        });
        return;
      }

      console.log('');
      console.log(`\x1b[32mAppended to document\x1b[0m`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to append text');
      throw error;
    }
  },
};
