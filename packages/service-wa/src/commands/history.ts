/**
 * uni wa history - Fetch message history from WhatsApp
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { execDaemon } from '../daemon-client';

export const historyCommand: Command = {
  name: 'history',
  description: 'Fetch message history from WhatsApp',
  args: [
    { name: 'chat', description: 'Chat (phone number or "me")', required: true },
  ],
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Number of messages (max: 50)',
      default: 50,
    },
  ],
  examples: [
    'uni wa history me',
    'uni wa history 919876543210 -n 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;
    const chat = args.chat as string;
    const limit = Math.min((flags.limit as number) || 50, 50);

    output.spinner('Fetching message history...');

    const result = await execDaemon({
      action: 'history',
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

    console.log(c.dim(`Found ${messages.length} messages${result.total ? ` (${result.total} in store)` : ''}\n`));

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

      console.log(`${c.dim(msg.id)} ${c.dim(`${dateStr} ${time}`)} ${c.cyan(sender)}${mediaIndicator}`);
      console.log(`  ${text.slice(0, 500)}${text.length > 500 ? '...' : ''}`);
      console.log('');
    }
  },
};
