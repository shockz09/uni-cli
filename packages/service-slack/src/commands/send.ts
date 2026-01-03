/**
 * uni slack send - Send messages
 */

import type { Command, CommandContext } from '@uni/shared';
import { slack } from '../api';

export const sendCommand: Command = {
  name: 'send',
  description: 'Send a message to a channel',
  aliases: ['msg', 'message'],
  args: [
    {
      name: 'channel',
      description: 'Channel name or ID',
      required: true,
    },
    {
      name: 'message',
      description: 'Message text',
      required: true,
    },
  ],
  options: [
    {
      name: 'thread',
      short: 't',
      type: 'string',
      description: 'Thread timestamp to reply to',
    },
  ],
  examples: [
    'uni slack send general "Hello team!"',
    'uni slack send C01234567 "Update: deployment complete"',
    'uni slack send general "Reply" --thread 1234567890.123456',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!slack.hasToken()) {
      output.error('Slack token not configured. Set SLACK_BOT_TOKEN environment variable.');
      return;
    }

    const channel = args.channel;
    const message = args.message;

    if (!channel || !message) {
      output.error('Please provide channel and message');
      return;
    }

    const spinner = output.spinner('Sending message...');

    try {
      const result = await slack.sendMessage(channel, message, {
        thread_ts: flags.thread as string | undefined,
      });

      spinner.success('Message sent');

      if (globalFlags.json) {
        output.json(result);
        return;
      }

      console.log(`\x1b[90mSent to ${result.channel} at ${result.ts}\x1b[0m`);
    } catch (error) {
      spinner.fail('Failed to send message');
      throw error;
    }
  },
};
