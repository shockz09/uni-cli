/**
 * uni wa read - Read messages from a chat
 * Note: Messages are collected while daemon runs
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { execDaemon } from '../daemon-client';

export const readCommand: Command = {
  name: 'read',
  description: 'Read messages from a chat',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
  ],
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Number of messages (default: 10)',
      default: 10,
    },
  ],
  examples: [
    'uni wa read me',
    'uni wa read 919876543210',
    'uni wa read me -n 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;
    const chat = args.chat as string;
    const limit = (flags.limit as number) || 10;

    const result = await execDaemon({
      action: 'read',
      chat,
      limit,
    });

    if (result.error) {
      output.error(result.error);
      return;
    }

    if (globalFlags.json) {
      output.json(result.messages || []);
      return;
    }

    const messages = result.messages || [];

    if (messages.length === 0) {
      console.log(c.dim('No messages found.'));
      if (result.note) {
        console.log(c.dim(result.note));
      }
      return;
    }

    console.log('');
    for (const msg of messages) {
      // Handle timestamp - can be number or Long object
      let ts = msg.timestamp;
      if (ts && typeof ts === 'object' && 'low' in ts) {
        ts = ts.low;
      }
      const date = ts ? new Date(Number(ts) * 1000) : null;
      const time = date && !isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const dateStr = date && !isNaN(date.getTime()) ? date.toLocaleDateString() : '';
      const sender = msg.fromMe ? 'You' : chat;
      const mediaIndicator = msg.hasMedia ? c.dim(' [media]') : '';
      const text = msg.text || c.dim('(no text)');

      console.log(`${c.dim(`${dateStr} ${time}`)} ${c.cyan(sender)}${mediaIndicator}`);
      console.log(`  ${text.slice(0, 500)}${text.length > 500 ? '...' : ''}`);
      console.log('');
    }
  },
};
