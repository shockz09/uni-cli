/**
 * uni gdrive share - Share a file with someone
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const shareCommand: Command = {
  name: 'share',
  description: 'Share a file with someone',
  args: [
    {
      name: 'file',
      description: 'File ID or search query',
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
      description: 'Permission role: reader, writer, commenter',
      default: 'reader',
    },
  ],
  examples: [
    'uni gdrive share 1abc123 user@example.com',
    'uni gdrive share "report.pdf" team@company.com --role writer',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    const fileQuery = args.file as string;
    const email = args.email as string;
    const role = (flags.role as string) || 'reader';

    if (!['reader', 'writer', 'commenter'].includes(role)) {
      output.error('Role must be: reader, writer, or commenter');
      return;
    }

    let fileId: string;
    let fileName: string;

    // Check if it's an ID or search query
    if (fileQuery.length > 20 && !fileQuery.includes(' ')) {
      fileId = fileQuery;
      const file = await gdrive.getFile(fileId);
      fileName = file.name;
    } else {
      const results = await gdrive.search(fileQuery, 1);
      if (!results.length) {
        output.error(`No file found matching "${fileQuery}"`);
        return;
      }
      fileId = results[0].id;
      fileName = results[0].name;
    }

    await gdrive.shareFile(fileId, email, role as 'reader' | 'writer' | 'commenter');

    if (globalFlags.json) {
      output.json({ id: fileId, name: fileName, sharedWith: email, role });
      return;
    }

    output.success(`Shared "${fileName}" with ${email} as ${role}`);
  },
};
