/**
 * uni telegram contacts - List contacts
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated, Api } from '../client';

export const contactsCommand: Command = {
  name: 'contacts',
  description: 'List Telegram contacts',
  args: [
    {
      name: 'search',
      description: 'Search query (optional)',
      required: false,
    },
  ],
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Max results (default: 50)',
      default: 50,
    },
  ],
  examples: [
    'uni telegram contacts',
    'uni telegram contacts "john"',
    'uni telegram contacts -n 100',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const searchQuery = args.search as string | undefined;
    const limit = (flags.limit as number) || 50;

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinner = output.spinner('Fetching contacts...');

    try {
      const client = await createClient();
      if (!client) {
        spinner.fail('Failed to connect');
        output.error('Could not connect to Telegram. Try `uni telegram auth` again.');
        return;
      }

      // Get contacts using the API
      const result = await client.invoke(
        new Api.contacts.GetContacts({
          hash: BigInt(0),
        })
      );

      await client.disconnect();

      if (!('users' in result)) {
        spinner.fail('No contacts found');
        return;
      }

      let users = result.users as Array<{
        id: bigint;
        firstName?: string;
        lastName?: string;
        username?: string;
        phone?: string;
      }>;

      // Filter by search query if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        users = users.filter((u) => {
          const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
          const username = (u.username || '').toLowerCase();
          return name.includes(query) || username.includes(query);
        });
      }

      // Limit results
      users = users.slice(0, limit);

      spinner.success(`${users.length} contacts`);

      if (globalFlags.json) {
        const data = users.map((u) => ({
          id: u.id.toString(),
          firstName: u.firstName,
          lastName: u.lastName,
          username: u.username,
          phone: u.phone,
        }));
        output.json(data);
        return;
      }

      console.log('');
      for (const user of users) {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'No name';
        const username = user.username ? c.cyan(`@${user.username}`) : '';
        const phone = user.phone ? c.dim(`+${user.phone}`) : '';

        console.log(`${c.bold(name)} ${username}`);
        if (phone) {
          console.log(`  ${phone}`);
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch contacts');
      throw error;
    }
  },
};
