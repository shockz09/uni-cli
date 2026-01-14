/**
 * uni gdrive rename - Rename a file
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const renameCommand: Command = {
  name: 'rename',
  description: 'Rename a file',
  args: [
    { name: 'fileId', description: 'File ID to rename', required: true },
    { name: 'newName', description: 'New name', required: true },
  ],
  examples: [
    'uni gdrive rename FILE_ID "New Name.pdf"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    const fileId = args.fileId as string;
    const newName = args.newName as string;

    const spinner = output.spinner('Renaming file...');
    try {
      const file = await gdrive.renameFile(fileId, newName);
      spinner.success(`Renamed to: ${file.name}`);

      if (globalFlags.json) {
        output.json(file);
      }
    } catch (error) {
      spinner.fail('Failed to rename file');
      throw error;
    }
  },
};
