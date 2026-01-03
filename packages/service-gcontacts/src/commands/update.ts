/**
 * uni gcontacts update - Update a contact
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcontacts } from '../api';

export const updateCommand: Command = {
  name: 'update',
  description: 'Update a contact',
  aliases: ['edit', 'modify'],
  args: [
    {
      name: 'search',
      description: 'Contact name to search for',
      required: true,
    },
  ],
  options: [
    {
      name: 'name',
      short: 'n',
      type: 'string',
      description: 'New name',
    },
    {
      name: 'email',
      short: 'e',
      type: 'string',
      description: 'New email',
    },
    {
      name: 'phone',
      short: 'p',
      type: 'string',
      description: 'New phone',
    },
    {
      name: 'company',
      short: 'c',
      type: 'string',
      description: 'New company',
    },
  ],
  examples: [
    'uni gcontacts update "John Doe" --email john.new@example.com',
    'uni gcontacts update "Jane" --phone "+1-555-1234"',
    'uni gcontacts update "Bob" --company "New Corp" --name "Robert Smith"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    if (!gcontacts.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcontacts auth" first.');
      return;
    }

    const search = args.search as string;
    const newName = flags.name as string | undefined;
    const newEmail = flags.email as string | undefined;
    const newPhone = flags.phone as string | undefined;
    const newCompany = flags.company as string | undefined;

    if (!newName && !newEmail && !newPhone && !newCompany) {
      output.error('Provide at least one update: --name, --email, --phone, or --company');
      return;
    }

    // Find contact
    const contacts = await gcontacts.searchContacts(search);
    if (!contacts.length) {
      output.error(`No contact found matching "${search}"`);
      return;
    }

    const contact = contacts[0];
    const oldName = gcontacts.getDisplayName(contact);

    const updated = await gcontacts.updateContact(contact.resourceName, {
      name: newName,
      email: newEmail,
      phone: newPhone,
      company: newCompany,
    });

    if (globalFlags.json) {
      output.json(updated);
      return;
    }

    output.success(`Updated contact: ${gcontacts.getDisplayName(updated)}`);
    if (newName) output.text(`  Name: ${oldName} → ${newName}`);
    if (newEmail) output.text(`  Email: ${newEmail}`);
    if (newPhone) output.text(`  Phone: ${newPhone}`);
    if (newCompany) output.text(`  Company: ${newCompany}`);
  },
};
