/**
 * uni gcontacts list - List contacts
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcontacts } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List contacts',
  aliases: ['ls'],
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Max contacts',
      default: 20,
    },
  ],
  examples: [
    'uni gcontacts list',
    'uni gcontacts list --limit 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gcontacts.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcontacts auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching contacts...');

    try {
      const contacts = await gcontacts.listContacts(flags.limit as number);
      spinner.success(`Found ${contacts.length} contact(s)`);

      if (globalFlags.json) {
        output.json(contacts);
        return;
      }

      if (contacts.length === 0) {
        output.info('No contacts');
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
      spinner.fail('Failed to fetch contacts');
      throw error;
    }
  },
};
