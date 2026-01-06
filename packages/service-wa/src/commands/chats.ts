/**
 * uni wa chats - List recent chats
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated, formatJid } from '../client';

export const chatsCommand: Command = {
  name: 'chats',
  description: 'List recent chats',
  aliases: ['list'],
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Number of chats (default: 20)',
      default: 20,
    },
  ],
  examples: [
    'uni wa chats',
    'uni wa chats -n 10',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;
    const limit = (flags.limit as number) || 20;

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run "uni wa auth" first.');
      return;
    }

    const spinner = output.spinner('Loading chats...');

    try {
      const sock = await createClient();
      if (!sock) {
        spinner.fail('Failed to connect');
        return;
      }

      // Wait for chats to load
      const chats = await new Promise<any[]>((resolve) => {
        const timeout = setTimeout(() => resolve([]), 10000);

        sock.ev.on('messaging-history.set', ({ chats }) => {
          clearTimeout(timeout);
          resolve(chats);
        });
      });

      await sock.end();

      const limitedChats = chats.slice(0, limit);
      spinner.success(`Found ${limitedChats.length} chat(s)`);

      if (globalFlags.json) {
        output.json(limitedChats.map((chat: any) => ({
          jid: chat.id,
          name: chat.name || formatJid(chat.id),
          unreadCount: chat.unreadCount || 0,
          lastMessageTime: chat.conversationTimestamp
            ? new Date(chat.conversationTimestamp * 1000).toISOString()
            : null,
        })));
        return;
      }

      console.log('');
      for (const chat of limitedChats) {
        const name = chat.name || formatJid(chat.id);
        const unread = chat.unreadCount || 0;
        const time = chat.conversationTimestamp
          ? new Date(chat.conversationTimestamp * 1000).toLocaleString()
          : '';

        const unreadMarker = unread > 0 ? c.bold(c.green(` (${unread})`)) : '';

        console.log(`${c.bold(name)}${unreadMarker}`);
        console.log(`   ${c.dim(chat.id)}`);
        if (time) console.log(`   ${c.dim(time)}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to load chats');
      throw error;
    }
  },
};
