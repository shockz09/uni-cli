/**
 * uni telegram chats - List dialogs
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated } from '../client';

export const chatsCommand: Command = {
  name: 'chats',
  description: 'List all chats (dialogs)',
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Max results (default: 20)',
      default: 20,
    },
    {
      name: 'archived',
      short: 'a',
      type: 'boolean',
      description: 'Show archived chats only',
    },
  ],
  examples: [
    'uni telegram chats',
    'uni telegram chats -n 50',
    'uni telegram chats --archived',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;
    const limit = (flags.limit as number) || 20;
    const archived = flags.archived as boolean;

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinner = output.spinner('Fetching chats...');

    try {
      const client = await createClient();
      if (!client) {
        spinner.fail('Failed to connect');
        output.error('Could not connect to Telegram. Try `uni telegram auth` again.');
        return;
      }

      const dialogs = await client.getDialogs({
        limit,
        archived,
      });

      await client.disconnect();

      spinner.success(`${dialogs.length} chats`);

      if (globalFlags.json) {
        const data = dialogs.map((d) => ({
          id: d.id?.toString(),
          title: d.title,
          name: d.name,
          unreadCount: d.unreadCount,
          isUser: d.isUser,
          isGroup: d.isGroup,
          isChannel: d.isChannel,
        }));
        output.json(data);
        return;
      }

      console.log('');
      for (const dialog of dialogs) {
        const type = dialog.isChannel ? 'CH' : dialog.isGroup ? 'GR' : 'DM';
        const typeColor = dialog.isChannel ? c.cyan : dialog.isGroup ? c.yellow : c.green;
        const unread = dialog.unreadCount > 0 ? c.red(` (${dialog.unreadCount})`) : '';
        const title = dialog.title || dialog.name || 'Unknown';

        console.log(`${typeColor(`[${type}]`)} ${c.bold(title)}${unread}`);
        console.log(c.dim(`     ID: ${dialog.id}`));
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch chats');
      throw error;
    }
  },
};
