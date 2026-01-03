/**
 * uni gdrive get - Get file details
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const getCommand: Command = {
  name: 'get',
  description: 'Get file details',
  aliases: ['info', 'view'],
  args: [
    {
      name: 'file',
      description: 'File ID or search query',
      required: true,
    },
  ],
  examples: [
    'uni gdrive get 1abc123def',
    'uni gdrive get "report.pdf"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    const fileQuery = args.file as string;
    let fileId: string;

    // Check if it's an ID or search query
    if (fileQuery.length > 20 && !fileQuery.includes(' ')) {
      fileId = fileQuery;
    } else {
      const results = await gdrive.search(fileQuery, 1);
      if (!results.length) {
        output.error(`No file found matching "${fileQuery}"`);
        return;
      }
      fileId = results[0].id;
    }

    const file = await gdrive.getFile(fileId);

    if (globalFlags.json) {
      output.json(file);
      return;
    }

    console.log('');
    console.log(`${gdrive.getMimeIcon(file.mimeType)} \x1b[1m${file.name}\x1b[0m`);
    console.log(`   ID: ${file.id}`);
    console.log(`   Type: ${file.mimeType}`);
    if (file.size) {
      const sizeKB = Math.round(parseInt(file.size) / 1024);
      console.log(`   Size: ${sizeKB} KB`);
    }
    if (file.modifiedTime) {
      console.log(`   Modified: ${new Date(file.modifiedTime).toLocaleString()}`);
    }
    if (file.owners?.[0]) {
      console.log(`   Owner: ${file.owners[0].displayName} <${file.owners[0].emailAddress}>`);
    }
    if (file.webViewLink) {
      console.log(`   \x1b[36m${file.webViewLink}\x1b[0m`);
    }
    console.log('');
  },
};
