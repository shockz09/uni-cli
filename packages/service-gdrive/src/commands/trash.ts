/**
 * uni gdrive trash - Manage trash
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const trashCommand: Command = {
  name: 'trash',
  description: 'Move file to trash, restore from trash, or list trash',
  args: [
    { name: 'fileId', description: 'File ID to trash/restore (optional)', required: false },
  ],
  options: [
    { name: 'restore', short: 'r', type: 'boolean', description: 'Restore file from trash' },
    { name: 'empty', short: 'e', type: 'boolean', description: 'Empty entire trash (permanent!)' },
    { name: 'list', short: 'l', type: 'boolean', description: 'List files in trash' },
    { name: 'limit', short: 'n', type: 'string', description: 'Number of items to list (default: 20)' },
  ],
  examples: [
    'uni gdrive trash FILE_ID',
    'uni gdrive trash FILE_ID --restore',
    'uni gdrive trash --list',
    'uni gdrive trash --empty',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    // List trash
    if (flags.list) {
      const limit = parseInt((flags.limit as string) || '20', 10);
      const spinner = output.spinner('Fetching trash...');
      try {
        const files = await gdrive.listTrash(limit);
        spinner.stop();

        if (globalFlags.json) {
          output.json(files);
          return;
        }

        if (files.length === 0) {
          output.info('Trash is empty.');
          return;
        }

        output.info(`Trash (${files.length} files):\n`);
        for (const file of files) {
          const icon = gdrive.getMimeIcon(file.mimeType);
          output.info(`  ${icon} ${file.name}`);
          output.info(`    ID: ${file.id}`);
        }
        return;
      } catch (error) {
        spinner.fail('Failed to list trash');
        throw error;
      }
    }

    // Empty trash
    if (flags.empty) {
      const spinner = output.spinner('Emptying trash...');
      try {
        await gdrive.emptyTrash();
        spinner.success('Trash emptied');
        return;
      } catch (error) {
        spinner.fail('Failed to empty trash');
        throw error;
      }
    }

    // Trash or restore file
    if (!args.fileId) {
      output.error('Specify a file ID or use --list/--empty');
      return;
    }

    const fileId = args.fileId as string;

    if (flags.restore) {
      const spinner = output.spinner('Restoring file...');
      try {
        const file = await gdrive.untrashFile(fileId);
        spinner.success(`Restored: ${file.name}`);
        if (globalFlags.json) output.json(file);
        return;
      } catch (error) {
        spinner.fail('Failed to restore file');
        throw error;
      }
    }

    // Move to trash
    const spinner = output.spinner('Moving to trash...');
    try {
      const file = await gdrive.trashFile(fileId);
      spinner.success(`Moved to trash: ${file.name}`);
      if (globalFlags.json) output.json(file);
    } catch (error) {
      spinner.fail('Failed to trash file');
      throw error;
    }
  },
};
