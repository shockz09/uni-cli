/**
 * uni slack pins - Pin and unpin messages
 */

import type { Command, CommandContext } from '@uni/shared';
import { slack } from '../api';

export const pinsCommand: Command = {
  name: 'pins',
  aliases: ['pin'],
  description: 'Pin, unpin, or list pinned messages',
  args: [
    { name: 'channel', description: 'Channel name or ID', required: true },
  ],
  options: [
    { name: 'add', short: 'a', type: 'string', description: 'Pin a message (timestamp)' },
    { name: 'remove', short: 'r', type: 'string', description: 'Unpin a message (timestamp)' },
  ],
  examples: [
    'uni slack pins general',
    'uni slack pins general --add 1234567890.123456',
    'uni slack pins general --remove 1234567890.123456',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!slack.hasToken()) {
      output.error('SLACK_BOT_TOKEN not set');
      return;
    }

    const channel = args.channel as string;

    // Pin a message
    if (flags.add) {
      const spinner = output.spinner('Pinning message...');
      try {
        await slack.pinMessage(channel, flags.add as string);
        spinner.success('Message pinned');
        if (globalFlags.json) output.json({ pinned: true, timestamp: flags.add });
        return;
      } catch (error) {
        spinner.fail('Failed to pin message');
        throw error;
      }
    }

    // Unpin a message
    if (flags.remove) {
      const spinner = output.spinner('Unpinning message...');
      try {
        await slack.unpinMessage(channel, flags.remove as string);
        spinner.success('Message unpinned');
        if (globalFlags.json) output.json({ unpinned: true, timestamp: flags.remove });
        return;
      } catch (error) {
        spinner.fail('Failed to unpin message');
        throw error;
      }
    }

    // List pinned messages
    const spinner = output.spinner('Fetching pinned messages...');
    try {
      const pins = await slack.listPins(channel);
      spinner.stop();

      if (globalFlags.json) {
        output.json(pins);
        return;
      }

      if (pins.length === 0) {
        output.info('No pinned messages in this channel.');
        return;
      }

      output.info(`Pinned messages (${pins.length}):\n`);
      for (const pin of pins) {
        const msg = pin.message;
        const time = new Date(parseFloat(msg.ts) * 1000).toLocaleString();
        const preview = msg.text.length > 60 ? msg.text.slice(0, 60) + '...' : msg.text;
        output.info(`  [${time}] ${preview}`);
        output.info(`    ts: ${msg.ts}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch pins');
      throw error;
    }
  },
};
