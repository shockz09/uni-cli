/**
 * uni gcontacts search - Search contacts
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcontacts } from '../api';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search contacts',
  aliases: ['s', 'find'],
  args: [
    {
      name: 'query',
      description: 'Search query (name, email, phone)',
      required: true,
    },
  ],
  examples: [
    'uni gcontacts search "John"',
    'uni gcontacts search "john@example.com"',
    'uni gcontacts search "+91"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gcontacts.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcontacts auth" first.');
      return;
    }

    const query = args.query as string;
    const spinner = output.spinner(`Searching for "${query}"...`);

    try {
      const contacts = await gcontacts.searchContacts(query);
      spinner.success(`Found ${contacts.length} contact(s)`);

      if (globalFlags.json) {
        output.json(contacts);
        return;
      }

      if (contacts.length === 0) {
        output.info('No contacts found');
        return;
      }

      console.log('');
      for (const contact of contacts) {
        const name = gcontacts.getDisplayName(contact);
        const email = gcontacts.getEmail(contact);
        const phone = gcontacts.getPhone(contact);
        const company = gcontacts.getCompany(contact);

        console.log(`  \x1b[1m${name}\x1b[0m`);
        if (email) console.log(`    \x1b[36m${email}\x1b[0m`);
        if (phone) console.log(`    \x1b[90m${phone}\x1b[0m`);
        if (company) console.log(`    \x1b[90m${company}\x1b[0m`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
