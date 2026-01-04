/**
 * uni gcontacts delete - Delete a contact
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcontacts } from '../api';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a contact',
  aliases: ['rm', 'remove'],
  args: [
    {
      name: 'query',
      description: 'Contact name or email',
      required: true,
    },
  ],
  examples: [
    'uni gcontacts delete "John Doe"',
    'uni gcontacts delete "old@email.com"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gcontacts.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcontacts auth" first.');
      return;
    }

    const query = args.query as string;
    const contacts = await gcontacts.searchContacts(query);

    if (contacts.length === 0) {
      output.error('Contact not found');
      return;
    }

    const contact = contacts[0];
    const name = gcontacts.getDisplayName(contact);

    await gcontacts.deleteContact(contact.resourceName);

    if (globalFlags.json) {
      output.json({ deleted: contact.resourceName, name });
      return;
    }

    output.success(`Deleted: ${name}`);
  },
};
