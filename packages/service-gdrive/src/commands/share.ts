/**
 * uni gdrive share - Share a file with someone or make it public
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const shareCommand: Command = {
  name: 'share',
  description: 'Share a file with someone or make it public',
  args: [
    {
      name: 'file',
      description: 'File ID or search query',
      required: true,
    },
    {
      name: 'target',
      description: 'Email address or "anyone" for public access',
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
    'uni gdrive share 1abc123 anyone',
    'uni gdrive share 1abc123 anyone --role writer',
    'uni gdrive share "report.pdf" team@company.com --role writer',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    const fileQuery = args.file as string;
    const target = args.target as string;
    const role = (flags.role as string) || 'reader';
    const isPublic = target.toLowerCase() === 'anyone' || target.toLowerCase() === 'public';

    if (isPublic && !['reader', 'writer'].includes(role)) {
      output.error('Public sharing only supports reader or writer roles');
      return;
    }

    if (!isPublic && !['reader', 'writer', 'commenter'].includes(role)) {
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

    if (isPublic) {
      const url = await gdrive.sharePublic(fileId, role as 'reader' | 'writer');

      if (globalFlags.json) {
        output.json({ id: fileId, name: fileName, public: true, role, url });
        return;
      }

      output.success(`"${fileName}" is now public (${role})`);
      console.log(`URL: ${url}`);
      return;
    }

    await gdrive.shareFile(fileId, target, role as 'reader' | 'writer' | 'commenter');

    if (globalFlags.json) {
      output.json({ id: fileId, name: fileName, sharedWith: target, role });
      return;
    }

    output.success(`Shared "${fileName}" with ${target} as ${role}`);
  },
};
