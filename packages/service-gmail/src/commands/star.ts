/**
 * uni gmail star - Star/unstar emails
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const starCommand: Command = {
  name: 'star',
  description: 'Star or unstar an email',
  args: [
    { name: 'messageId', description: 'Message ID', required: true },
  ],
  options: [
    { name: 'remove', short: 'r', type: 'boolean', description: 'Unstar the message' },
  ],
  examples: [
    'uni gmail star MSG_ID',
    'uni gmail star MSG_ID --remove',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const messageId = args.messageId as string;
    const remove = Boolean(flags.remove);

    const spinner = output.spinner(remove ? 'Removing star...' : 'Starring message...');
    try {
      if (remove) {
        await gmail.unstarMessage(messageId);
        spinner.success('Star removed');
      } else {
        await gmail.starMessage(messageId);
        spinner.success('Message starred');
      }

      if (globalFlags.json) {
        output.json({ messageId, starred: !remove });
      }
    } catch (error) {
      spinner.fail(remove ? 'Failed to unstar' : 'Failed to star');
      throw error;
    }
  },
};
