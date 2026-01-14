/**
 * uni gdrive permissions - Manage file permissions
 */

import type { Command, CommandContext } from '@uni/shared';
import { gdrive } from '../api';

export const permissionsCommand: Command = {
  name: 'permissions',
  aliases: ['perms'],
  description: 'View or manage file permissions',
  args: [
    { name: 'fileId', description: 'File ID', required: true },
  ],
  options: [
    { name: 'remove', short: 'r', type: 'string', description: 'Remove permission by ID' },
  ],
  examples: [
    'uni gdrive permissions FILE_ID',
    'uni gdrive permissions FILE_ID --remove PERMISSION_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gdrive.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdrive auth" first.');
      return;
    }

    const fileId = args.fileId as string;

    // Remove permission
    if (flags.remove) {
      const spinner = output.spinner('Removing permission...');
      try {
        await gdrive.removePermission(fileId, flags.remove as string);
        spinner.success('Permission removed');
        return;
      } catch (error) {
        spinner.fail('Failed to remove permission');
        throw error;
      }
    }

    // List permissions
    const spinner = output.spinner('Fetching permissions...');
    try {
      const permissions = await gdrive.getPermissions(fileId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(permissions);
        return;
      }

      if (permissions.length === 0) {
        output.log('No permissions found.');
        return;
      }

      output.log(`Permissions (${permissions.length}):\n`);
      for (const perm of permissions) {
        const email = perm.emailAddress || 'N/A';
        output.log(`  ${perm.type}: ${email} [${perm.role}]`);
        output.log(`    ID: ${perm.id}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch permissions');
      throw error;
    }
  },
};
