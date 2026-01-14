/**
 * uni slack threads - Get thread replies
 */

import type { Command, CommandContext } from '@uni/shared';
import { slack } from '../api';

export const threadsCommand: Command = {
  name: 'threads',
  aliases: ['thread', 'replies'],
  description: 'Get thread replies',
  args: [
    { name: 'channel', description: 'Channel name or ID', required: true },
    { name: 'threadTs', description: 'Thread timestamp', required: true },
  ],
  options: [
    { name: 'limit', short: 'n', type: 'string', description: 'Number of replies (default: 20)' },
  ],
  examples: [
    'uni slack threads general 1234567890.123456',
    'uni slack threads C01234567 1234567890.123456 --limit 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!slack.hasToken()) {
      output.error('SLACK_BOT_TOKEN not set');
      return;
    }

    const channel = args.channel as string;
    const threadTs = args.threadTs as string;
    const limit = parseInt((flags.limit as string) || '20', 10);

    const spinner = output.spinner('Fetching thread replies...');
    try {
      const messages = await slack.getThreadReplies(channel, threadTs, limit);
      spinner.stop();

      if (globalFlags.json) {
        output.json(messages);
        return;
      }

      if (messages.length === 0) {
        output.info('No replies in thread.');
        return;
      }

      output.info(`Thread replies (${messages.length}):\n`);
      for (const msg of messages) {
        const time = new Date(parseFloat(msg.ts) * 1000).toLocaleString();
        output.info(`  [${time}] ${msg.user || 'bot'}: ${msg.text}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch thread');
      throw error;
    }
  },
};
