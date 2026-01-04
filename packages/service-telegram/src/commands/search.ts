/**
 * uni telegram search - Search messages
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated } from '../client';

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
      description: 'Search in specific chat only',
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
    'uni telegram search "meeting"',
    'uni telegram search "project" -c @username',
    'uni telegram search "dinner" -n 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const query = args.query as string;
    const chatFilter = flags.chat as string | undefined;
    const limit = (flags.limit as number) || 20;

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinner = output.spinner(`Searching for "${query}"...`);

    try {
      const client = await createClient();
      if (!client) {
        spinner.fail('Failed to connect');
        output.error('Could not connect to Telegram. Try `uni telegram auth` again.');
        return;
      }

      let entity;
      if (chatFilter) {
        try {
          entity = await client.getEntity(chatFilter);
        } catch {
          // Try to find by title
          const dialogs = await client.getDialogs({ limit: 100 });
          const found = dialogs.find(
            (d) =>
              d.title?.toLowerCase() === chatFilter.toLowerCase() ||
              d.name?.toLowerCase() === chatFilter.toLowerCase()
          );
          if (found) {
            entity = found.entity;
          } else {
            await client.disconnect();
            spinner.fail('Chat not found');
            output.error(`Could not find chat: ${chatFilter}`);
            return;
          }
        }
      }

      // Search messages
      const messages: Array<{
        id: number;
        text: string;
        date: number | null;
        chatTitle: string;
        sender: string;
      }> = [];

      const iter = client.iterMessages(entity, {
        search: query,
        limit,
      });

      for await (const msg of iter) {
        const chatTitle =
          (msg.chat as { title?: string })?.title ||
          (msg.chat as { firstName?: string; lastName?: string })?.firstName ||
          'Unknown';
        const sender =
          (msg.sender as { firstName?: string; username?: string })?.firstName ||
          (msg.sender as { firstName?: string; username?: string })?.username ||
          'Unknown';

        messages.push({
          id: msg.id,
          text: msg.text || '',
          date: msg.date,
          chatTitle,
          sender,
        });
      }

      await client.disconnect();

      if (messages.length === 0) {
        spinner.fail('No results found');
        return;
      }

      spinner.success(`Found ${messages.length} messages`);

      if (globalFlags.json) {
        output.json(messages);
        return;
      }

      console.log('');
      for (const msg of messages) {
        const date = msg.date ? new Date(msg.date * 1000) : null;
        const dateStr = date ? date.toLocaleDateString() : '';
        const time = date
          ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '';

        console.log(
          `${c.dim(`${dateStr} ${time}`)} ${c.cyan(msg.chatTitle)} | ${msg.sender}`
        );
        console.log(`  ${msg.text.slice(0, 200)}${msg.text.length > 200 ? '...' : ''}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
