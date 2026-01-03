/**
 * uni gcontacts add - Add a contact
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gcontacts } from '../api';

export const addCommand: Command = {
  name: 'add',
  description: 'Add a new contact',
  aliases: ['new', 'create'],
  args: [
    {
      name: 'name',
      description: 'Contact name',
      required: true,
    },
  ],
  options: [
    {
      name: 'email',
      short: 'e',
      type: 'string',
      description: 'Email address',
    },
    {
      name: 'phone',
      short: 'p',
      type: 'string',
      description: 'Phone number',
    },
    {
      name: 'company',
      short: 'c',
      type: 'string',
      description: 'Company name',
    },
  ],
  examples: [
    'uni gcontacts add "John Doe" --email john@example.com',
    'uni gcontacts add "Jane" --phone "+91-9876543210" --company "Acme Inc"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gcontacts.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcontacts auth" first.');
      return;
    }

    const name = args.name as string;
    const spinner = output.spinner(`Adding contact "${name}"...`);

    try {
      const contact = await gcontacts.createContact({
        name,
        email: flags.email as string | undefined,
        phone: flags.phone as string | undefined,
        company: flags.company as string | undefined,
      });

      spinner.success('Contact added');

      if (globalFlags.json) {
        output.json(contact);
        return;
      }

      console.log('');
      console.log(`  ${c.bold(gcontacts.getDisplayName(contact))}`);
      const email = gcontacts.getEmail(contact);
      const phone = gcontacts.getPhone(contact);
      const company = gcontacts.getCompany(contact);
      if (email) console.log(`    ${c.cyan(email)}`);
      if (phone) console.log(`    ${c.dim(phone)}`);
      if (company) console.log(`    ${c.dim(company)}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to add contact');
      throw error;
    }
  },
};
