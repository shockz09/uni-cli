/**
 * uni wa search - Search messages
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated, formatJid, getMessageText } from '../client';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search messages across chats',
  args: [
    {
      name: 'query',
      description: 'Search query',
      required: true,
    },
  ],
  options: [
    {
      name: 'chat',
      short: 'c',
      type: 'string',
      description: 'Limit to specific chat',
    },
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Max results (default: 20)',
      default: 20,
    },
  ],
  examples: [
    'uni wa search "meeting"',
    'uni wa search "invoice" -c 919876543210',
    'uni wa search "flight" -n 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const query = (args.query as string).toLowerCase();
    const chatFilter = flags.chat as string | undefined;
    const limit = (flags.limit as number) || 20;

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run "uni wa auth" first.');
      return;
    }

    const spinner = output.spinner(`Searching for "${query}"...`);

    try {
      const sock = await createClient();
      if (!sock) {
        spinner.fail('Failed to connect');
        return;
      }

      // Wait for message history
      const allMessages: any[] = [];

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 15000);

        sock.ev.on('messaging-history.set', ({ messages }) => {
          allMessages.push(...messages);
        });

        setTimeout(() => {
          clearTimeout(timeout);
          resolve();
        }, 5000);
      });

      await sock.end();

      // Filter messages by query
      const matches = allMessages
        .filter((msg) => {
          const text = getMessageText(msg);
          if (!text) return false;
          if (!text.toLowerCase().includes(query)) return false;

          // Filter by chat if specified
          if (chatFilter) {
            const jid = msg.key?.remoteJid || '';
            if (!jid.includes(chatFilter.replace(/[^0-9]/g, ''))) {
              return false;
            }
          }

          return true;
        })
        .slice(0, limit);

      if (matches.length === 0) {
        spinner.success('No messages found');
        return;
      }

      spinner.success(`Found ${matches.length} message(s)`);

      if (globalFlags.json) {
        output.json(matches.map((msg: any) => ({
          id: msg.key?.id,
          chat: msg.key?.remoteJid,
          fromMe: msg.key?.fromMe,
          timestamp: msg.messageTimestamp
            ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
            : null,
          text: getMessageText(msg),
        })));
        return;
      }

      console.log('');
      for (const msg of matches) {
        const chat = formatJid(msg.key?.remoteJid || '');
        const fromMe = msg.key?.fromMe;
        const timestamp = msg.messageTimestamp
          ? new Date(Number(msg.messageTimestamp) * 1000).toLocaleString()
          : '';
        const text = getMessageText(msg) || '';
        const id = msg.key?.id || '';

        console.log(`${c.bold(chat)}  ${c.dim(timestamp)}`);
        console.log(`  ${fromMe ? c.cyan('[You]') : ''} ${text}`);
        console.log(`  ${c.dim(`ID: ${id}`)}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
