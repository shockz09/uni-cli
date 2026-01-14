/**
 * uni gmail archive - Archive/unarchive emails
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const archiveCommand: Command = {
  name: 'archive',
  description: 'Archive or unarchive an email',
  args: [
    { name: 'messageId', description: 'Message ID', required: true },
  ],
  options: [
    { name: 'undo', short: 'u', type: 'boolean', description: 'Unarchive (move back to inbox)' },
  ],
  examples: [
    'uni gmail archive MSG_ID',
    'uni gmail archive MSG_ID --undo',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const messageId = args.messageId as string;
    const undo = Boolean(flags.undo);

    const spinner = output.spinner(undo ? 'Moving to inbox...' : 'Archiving...');
    try {
      if (undo) {
        await gmail.unarchiveMessage(messageId);
        spinner.success('Moved to inbox');
      } else {
        await gmail.archiveMessage(messageId);
        spinner.success('Archived');
      }

      if (globalFlags.json) {
        output.json({ messageId, archived: !undo });
      }
    } catch (error) {
      spinner.fail(undo ? 'Failed to unarchive' : 'Failed to archive');
      throw error;
    }
  },
};
