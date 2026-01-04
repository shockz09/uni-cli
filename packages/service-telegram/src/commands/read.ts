/**
 * uni telegram read - Read messages from a chat
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated } from '../client';

export const readCommand: Command = {
  name: 'read',
  description: 'Read messages from a chat',
  args: [
    {
      name: 'chat',
      description: 'Chat identifier (@username, phone, ID, or title)',
      required: true,
    },
  ],
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Number of messages (default: 20)',
      default: 20,
    },
  ],
  examples: [
    'uni telegram read @username',
    'uni telegram read +1234567890',
    'uni telegram read "Family Group" -n 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const chat = args.chat as string;
    const limit = (flags.limit as number) || 20;

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinner = output.spinner(`Fetching messages from ${chat}...`);

    try {
      const client = await createClient();
      if (!client) {
        spinner.fail('Failed to connect');
        output.error('Could not connect to Telegram. Try `uni telegram auth` again.');
        return;
      }

      // Get entity (resolve username/phone/id to entity)
      let entity;
      try {
        entity = await client.getEntity(chat);
      } catch {
        // Try to find by title in dialogs
        const dialogs = await client.getDialogs({ limit: 100 });
        const found = dialogs.find(
          (d) =>
            d.title?.toLowerCase() === chat.toLowerCase() ||
            d.name?.toLowerCase() === chat.toLowerCase()
        );
        if (found) {
          entity = found.entity;
        } else {
          await client.disconnect();
          spinner.fail('Chat not found');
          output.error(`Could not find chat: ${chat}`);
          return;
        }
      }

      const messages = await client.getMessages(entity, { limit });

      await client.disconnect();

      spinner.success(`${messages.length} messages`);

      if (globalFlags.json) {
        const data = messages.map((m) => ({
          id: m.id,
          text: m.text,
          date: m.date ? new Date(m.date * 1000).toISOString() : null,
          sender: (m.sender as { firstName?: string; lastName?: string; username?: string })?.firstName ||
                  (m.sender as { firstName?: string; lastName?: string; username?: string })?.username ||
                  'Unknown',
          hasMedia: !!m.media,
        }));
        output.json(data);
        return;
      }

      console.log('');
      // Reverse to show oldest first
      for (const msg of [...messages].reverse()) {
        const date = msg.date ? new Date(msg.date * 1000) : null;
        const time = date ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const dateStr = date ? date.toLocaleDateString() : '';
        const sender =
          (msg.sender as { firstName?: string; lastName?: string; username?: string })?.firstName ||
          (msg.sender as { firstName?: string; lastName?: string; username?: string })?.username ||
          'Unknown';

        const mediaIndicator = msg.media ? c.dim(' [media]') : '';
        const text = msg.text || c.dim('(no text)');

        console.log(`${c.dim(`${dateStr} ${time}`)} ${c.cyan(sender)}${mediaIndicator}`);
        console.log(`  ${text.slice(0, 500)}${text.length > 500 ? '...' : ''}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch messages');
      throw error;
    }
  },
};
