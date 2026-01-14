/**
 * uni gdocs header - Manage document headers
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const headerCommand: Command = {
  name: 'header',
  description: 'Add, update, or remove document header',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
  ],
  options: [
    { name: 'text', short: 't', type: 'string', description: 'Header text to add' },
    { name: 'remove', short: 'r', type: 'string', description: 'Header ID to remove' },
  ],
  examples: [
    'uni gdocs header ID --text "Company Name"',
    'uni gdocs header ID --text "Confidential Document"',
    'uni gdocs header ID --remove kix.abc123',
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
      output.error('Specify --text to add a header or --remove <headerId> to remove one');
      return;
    }

    const spinner = output.spinner(removeId ? 'Removing header...' : 'Adding header...');

    try {
      if (removeId) {
        await gdocs.deleteHeader(documentId, removeId);
        spinner.success(`Removed header ${removeId}`);

        if (globalFlags.json) {
          output.json({ removed: removeId });
        }
      } else {
        const headerId = await gdocs.createHeader(documentId);
        if (text && headerId) {
          await gdocs.insertTextInHeaderFooter(documentId, headerId, text);
        }
        spinner.success(`Created header${text ? ` with text: "${text}"` : ''}`);

        if (globalFlags.json) {
          output.json({ headerId, text });
        }
      }
    } catch (error) {
      spinner.fail(removeId ? 'Failed to remove header' : 'Failed to add header');
      throw error;
    }
  },
};
