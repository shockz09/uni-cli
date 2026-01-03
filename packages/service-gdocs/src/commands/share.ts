/**
 * uni gdocs share - Share document with email
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const shareCommand: Command = {
  name: 'share',
  description: 'Share document with email',
  args: [
    {
      name: 'id',
      description: 'Document ID or URL',
      required: true,
    },
    {
      name: 'email',
      description: 'Email address to share with',
      required: true,
    },
  ],
  options: [
    {
      name: 'role',
      short: 'r',
      type: 'string',
      description: 'Permission role: reader or writer (default: writer)',
      default: 'writer',
    },
  ],
  examples: [
    'uni gdocs share 1abc123XYZ colleague@company.com',
    'uni gdocs share 1abc123XYZ viewer@example.com --role reader',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const email = args.email as string;
    const role = (flags.role as string) === 'reader' ? 'reader' : 'writer';

    const spinner = output.spinner(`Sharing with ${email}...`);

    try {
      await gdocs.shareDocument(documentId, email, role);

      spinner.success('Document shared');

      if (globalFlags.json) {
        output.json({
          documentId,
          sharedWith: email,
          role,
          success: true,
        });
        return;
      }

      console.log('');
      console.log(`${c.green(`Shared with ${email}`)} (${role} access)`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to share document');
      throw error;
    }
  },
};
