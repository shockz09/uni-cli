/**
 * uni gdrive move - Move a file
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const moveCommand: Command = {
  name: 'move',
  aliases: ['mv'],
  description: 'Move a file to a different folder',
  args: [
    { name: 'fileId', description: 'File ID to move', required: true },
    { name: 'folderId', description: 'Destination folder ID', required: true },
  ],
  examples: [
    'uni gdrive move FILE_ID FOLDER_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    const fileId = args.fileId as string;
    const folderId = args.folderId as string;

    const spinner = output.spinner('Moving file...');
    try {
      const file = await gdrive.moveFile(fileId, folderId);
      spinner.success(`Moved: ${file.name}`);

      if (globalFlags.json) {
        output.json(file);
      }
    } catch (error) {
      spinner.fail('Failed to move file');
      throw error;
    }
  },
};
