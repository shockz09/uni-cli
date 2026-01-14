/**
 * uni gdrive copy - Copy a file
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const copyCommand: Command = {
  name: 'copy',
  aliases: ['cp', 'duplicate'],
  description: 'Copy a file',
  args: [
    { name: 'fileId', description: 'File ID to copy', required: true },
  ],
  options: [
    { name: 'name', short: 'n', type: 'string', description: 'New name for the copy' },
    { name: 'parent', short: 'p', type: 'string', description: 'Destination folder ID' },
  ],
  examples: [
    'uni gdrive copy FILE_ID',
    'uni gdrive copy FILE_ID --name "Copy of Document"',
    'uni gdrive copy FILE_ID --parent FOLDER_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    const fileId = args.fileId as string;
    const name = flags.name as string | undefined;
    const parentId = flags.parent as string | undefined;

    const spinner = output.spinner('Copying file...');
    try {
      const file = await gdrive.copyFile(fileId, name, parentId);
      spinner.success(`Copied: ${file.name}`);

      if (globalFlags.json) {
        output.json(file);
      } else {
        output.info(`ID: ${file.id}`);
        if (file.webViewLink) output.info(`Link: ${file.webViewLink}`);
      }
    } catch (error) {
      spinner.fail('Failed to copy file');
      throw error;
    }
  },
};
