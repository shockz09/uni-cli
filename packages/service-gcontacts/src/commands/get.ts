/**
 * uni gcontacts get - Get contact details
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcontacts } from '../api';

export const getCommand: Command = {
  name: 'get',
  description: 'Get contact details',
  aliases: ['view', 'show'],
  args: [
    {
      name: 'query',
      description: 'Contact name or email',
      required: true,
    },
  ],
  examples: [
    'uni gcontacts get "John Doe"',
    'uni gcontacts get "john@example.com"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gcontacts.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcontacts auth" first.');
      return;
    }

    const query = args.query as string;
    const spinner = output.spinner(`Finding "${query}"...`);

    try {
      const contacts = await gcontacts.searchContacts(query);

      if (contacts.length === 0) {
        spinner.fail('Contact not found');
        return;
      }

      const contact = contacts[0];
      spinner.success('Found contact');

      if (globalFlags.json) {
        output.json(contact);
        return;
      }

      const name = gcontacts.getDisplayName(contact);
      const emails = contact.emailAddresses || [];
      const phones = contact.phoneNumbers || [];
      const company = gcontacts.getCompany(contact);

      console.log('');
      console.log(`  \x1b[1m${name}\x1b[0m`);

      if (emails.length > 0) {
        console.log('');
        console.log('  \x1b[90mEmails:\x1b[0m');
        for (const email of emails) {
          const type = email.type ? ` (${email.type})` : '';
          console.log(`    \x1b[36m${email.value}\x1b[0m${type}`);
        }
      }

      if (phones.length > 0) {
        console.log('');
        console.log('  \x1b[90mPhones:\x1b[0m');
        for (const phone of phones) {
          const type = phone.type ? ` (${phone.type})` : '';
          console.log(`    ${phone.value}${type}`);
        }
      }

      if (company) {
        console.log('');
        console.log(`  \x1b[90mCompany:\x1b[0m ${company}`);
      }

      console.log('');
    } catch (error) {
      spinner.fail('Failed to get contact');
      throw error;
    }
  },
};
