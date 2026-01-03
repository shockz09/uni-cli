/**
 * uni slack messages - Read messages
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { slack } from '../api';

export const messagesCommand: Command = {
  name: 'messages',
  description: 'Read messages from a channel',
  aliases: ['msgs', 'read'],
  args: [
    {
      name: 'channel',
      description: 'Channel name or ID',
      required: true,
    },
  ],
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Number of messages',
      default: 10,
    },
  ],
  examples: [
    'uni slack messages general',
    'uni slack messages general --limit 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!slack.hasToken()) {
      output.error('Slack token not configured. Set SLACK_BOT_TOKEN environment variable.');
      return;
    }

    const channel = args.channel;
    if (!channel) {
      output.error('Please provide a channel');
      return;
    }

    const spinner = output.spinner('Fetching messages...');

    try {
      const messages = await slack.getMessages(channel, {
        limit: flags.limit as number,
      });

      spinner.success(`Found ${messages.length} messages`);

      if (globalFlags.json) {
        output.json(messages);
        return;
      }

      console.log('');
      // Reverse to show oldest first
      for (const msg of messages.reverse()) {
        const time = new Date(parseFloat(msg.ts) * 1000).toLocaleTimeString();
        const user = msg.user || 'bot';
        const thread = msg.reply_count ? ` ${c.dim(`(${msg.reply_count} replies)`)}` : '';

        console.log(`${c.cyan(time)} ${c.bold(user)}${thread}`);
        console.log(`  ${msg.text}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch messages');
      throw error;
    }
  },
};
