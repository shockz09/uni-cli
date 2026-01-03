/**
 * uni gdrive list - List files
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List files in Drive',
  aliases: ['ls'],
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Maximum files',
      default: 20,
    },
    {
      name: 'folder',
      short: 'f',
      type: 'string',
      description: 'Folder ID to list',
    },
  ],
  examples: [
    'uni gdrive list',
    'uni gdrive list --limit 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth".');
      return;
    }

    const spinner = output.spinner('Fetching files...');

    try {
      const files = await gdrive.listFiles({
        pageSize: flags.limit as number,
        folderId: flags.folder as string | undefined,
      });

      spinner.success(`Found ${files.length} files`);

      if (globalFlags.json) {
        output.json(files);
        return;
      }

      console.log('');
      for (const file of files) {
        const icon = gdrive.getMimeIcon(file.mimeType);
        const size = file.size ? ` (${formatSize(parseInt(file.size))})` : '';
        console.log(`${icon} \x1b[1m${file.name}\x1b[0m${size}`);
        if (file.webViewLink) {
          console.log(`   \x1b[36m${file.webViewLink}\x1b[0m`);
        }
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed');
      throw error;
    }
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
