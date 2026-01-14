/**
 * uni gdocs footer - Manage document footers
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const footerCommand: Command = {
  name: 'footer',
  description: 'Add, update, or remove document footer',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
  ],
  options: [
    { name: 'text', short: 't', type: 'string', description: 'Footer text to add' },
    { name: 'remove', short: 'r', type: 'string', description: 'Footer ID to remove' },
  ],
  examples: [
    'uni gdocs footer ID --text "Page 1"',
    'uni gdocs footer ID --text "© 2025 Company"',
    'uni gdocs footer ID --remove kix.xyz789',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const text = flags.text as string | undefined;
    const removeId = flags.remove as string | undefined;

    if (!text && !removeId) {
      output.error('Specify --text to add a footer or --remove <footerId> to remove one');
      return;
    }

    const spinner = output.spinner(removeId ? 'Removing footer...' : 'Adding footer...');

    try {
      if (removeId) {
        await gdocs.deleteFooter(documentId, removeId);
        spinner.success(`Removed footer ${removeId}`);

        if (globalFlags.json) {
          output.json({ removed: removeId });
        }
      } else {
        const footerId = await gdocs.createFooter(documentId);
        if (text && footerId) {
          await gdocs.insertTextInHeaderFooter(documentId, footerId, text);
        }
        spinner.success(`Created footer${text ? ` with text: "${text}"` : ''}`);

        if (globalFlags.json) {
          output.json({ footerId, text });
        }
      }
    } catch (error) {
      spinner.fail(removeId ? 'Failed to remove footer' : 'Failed to add footer');
      throw error;
    }
  },
};
