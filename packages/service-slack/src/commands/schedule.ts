/**
 * uni slack schedule - Schedule messages
 */

import type { Command, CommandContext } from '@uni/shared';
import { slack } from '../api';

export const scheduleCommand: Command = {
  name: 'schedule',
  aliases: ['later', 'timer'],
  description: 'Schedule messages for later',
  args: [
    { name: 'channel', description: 'Channel name or ID', required: true },
  ],
  options: [
    { name: 'message', short: 'm', type: 'string', description: 'Message to schedule' },
    { name: 'time', short: 't', type: 'string', description: 'Unix timestamp or relative time (e.g., "+1h", "+30m")' },
    { name: 'list', short: 'l', type: 'boolean', description: 'List scheduled messages' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete a scheduled message by ID' },
    { name: 'thread', type: 'string', description: 'Thread timestamp for threaded reply' },
  ],
  examples: [
    'uni slack schedule general --list',
    'uni slack schedule general --message "Good morning!" --time "+1h"',
    'uni slack schedule general -m "Reminder" -t 1700000000',
    'uni slack schedule general --delete Q1234567890',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!slack.hasToken()) {
      output.error('SLACK_BOT_TOKEN not set');
      return;
    }

    const channel = args.channel as string;

    // List scheduled messages
    if (flags.list) {
      const spinner = output.spinner('Fetching scheduled messages...');
      try {
        const scheduled = await slack.listScheduledMessages(channel);
        spinner.stop();

        if (globalFlags.json) {
          output.json(scheduled);
          return;
        }

        if (scheduled.length === 0) {
          output.info('No scheduled messages.');
          return;
        }

        output.info(`Scheduled messages (${scheduled.length}):\n`);
        for (const msg of scheduled) {
          const time = new Date(msg.post_at * 1000).toLocaleString();
          const preview = msg.text.length > 50 ? msg.text.slice(0, 50) + '...' : msg.text;
          output.info(`  [${time}] ${preview}`);
          output.info(`    ID: ${msg.id}`);
        }
        return;
      } catch (error) {
        spinner.fail('Failed to fetch scheduled messages');
        throw error;
      }
    }

    // Delete scheduled message
    if (flags.delete) {
      const spinner = output.spinner('Deleting scheduled message...');
      try {
        await slack.deleteScheduledMessage(channel, flags.delete as string);
        spinner.success('Scheduled message deleted');
        if (globalFlags.json) output.json({ deleted: true, id: flags.delete });
        return;
      } catch (error) {
        spinner.fail('Failed to delete scheduled message');
        throw error;
      }
    }

    // Schedule a new message
    if (!flags.message || !flags.time) {
      output.error('Both --message and --time are required to schedule a message');
      return;
    }

    const text = flags.message as string;
    let postAt: number;

    // Parse time
    const timeStr = flags.time as string;
    if (timeStr.startsWith('+')) {
      // Relative time
      const match = timeStr.match(/^\+(\d+)(h|m|s)$/);
      if (!match) {
        output.error('Invalid relative time format. Use +1h, +30m, +60s');
        return;
      }
      const [, num, unit] = match;
      const multipliers: Record<string, number> = { h: 3600, m: 60, s: 1 };
      postAt = Math.floor(Date.now() / 1000) + parseInt(num, 10) * multipliers[unit];
    } else {
      // Unix timestamp
      postAt = parseInt(timeStr, 10);
      if (isNaN(postAt)) {
        output.error('Invalid time format. Use Unix timestamp or relative time (+1h, +30m)');
        return;
      }
    }

    const spinner = output.spinner('Scheduling message...');
    try {
      const options: { thread_ts?: string } = {};
      if (flags.thread) options.thread_ts = flags.thread as string;

      const result = await slack.scheduleMessage(channel, text, postAt, options);
      spinner.success(`Message scheduled for ${new Date(result.post_at * 1000).toLocaleString()}`);

      if (globalFlags.json) {
        output.json(result);
      } else {
        output.info(`  ID: ${result.scheduled_message_id}`);
      }
    } catch (error) {
      spinner.fail('Failed to schedule message');
      throw error;
    }
  },
};
