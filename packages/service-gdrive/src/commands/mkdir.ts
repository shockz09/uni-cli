/**
 * uni gdrive mkdir - Create a folder
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const mkdirCommand: Command = {
  name: 'mkdir',
  aliases: ['newfolder', 'create-folder'],
  description: 'Create a new folder',
  args: [
    { name: 'name', description: 'Folder name', required: true },
  ],
  options: [
    { name: 'parent', short: 'p', type: 'string', description: 'Parent folder ID' },
  ],
  examples: [
    'uni gdrive mkdir "My Folder"',
    'uni gdrive mkdir "Subfolder" --parent FOLDER_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    const name = args.name as string;
    const parentId = flags.parent as string | undefined;

    const spinner = output.spinner('Creating folder...');
    try {
      const folder = await gdrive.createFolder(name, parentId);
      spinner.success(`Created folder: ${folder.name}`);

      if (globalFlags.json) {
        output.json(folder);
      } else {
        output.info(`ID: ${folder.id}`);
        if (folder.webViewLink) output.info(`Link: ${folder.webViewLink}`);
      }
    } catch (error) {
      spinner.fail('Failed to create folder');
      throw error;
    }
  },
};
