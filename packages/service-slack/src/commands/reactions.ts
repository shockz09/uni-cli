/**
 * uni slack reactions - Add or remove reactions
 */

import type { Command, CommandContext } from '@uni/shared';
import { slack } from '../api';

export const reactionsCommand: Command = {
  name: 'reactions',
  aliases: ['react', 'emoji'],
  description: 'Add or remove reactions from messages',
  args: [
    { name: 'channel', description: 'Channel name or ID', required: true },
    { name: 'timestamp', description: 'Message timestamp', required: true },
    { name: 'emoji', description: 'Emoji name (without colons)', required: true },
  ],
  options: [
    { name: 'remove', short: 'r', type: 'boolean', description: 'Remove reaction instead of adding' },
  ],
  examples: [
    'uni slack reactions general 1234567890.123456 thumbsup',
    'uni slack reactions C01234567 1234567890.123456 fire',
    'uni slack reactions general 1234567890.123456 thumbsup --remove',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!slack.hasToken()) {
      output.error('SLACK_BOT_TOKEN not set');
      return;
    }

    const channel = args.channel as string;
    const timestamp = args.timestamp as string;
    const emoji = args.emoji as string;
    const remove = flags.remove as boolean;

    const spinner = output.spinner(remove ? 'Removing reaction...' : 'Adding reaction...');
    try {
      if (remove) {
        await slack.removeReaction(channel, timestamp, emoji);
        spinner.success(`Removed :${emoji}: reaction`);
      } else {
        await slack.addReaction(channel, timestamp, emoji);
        spinner.success(`Added :${emoji}: reaction`);
      }

      if (globalFlags.json) {
        output.json({ success: true, emoji, action: remove ? 'removed' : 'added' });
      }
    } catch (error) {
      spinner.fail('Failed to update reaction');
      throw error;
    }
  },
};
