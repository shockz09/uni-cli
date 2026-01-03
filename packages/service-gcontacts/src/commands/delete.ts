/**
 * uni gcontacts delete - Delete a contact
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
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
  options: [
    {
      name: 'force',
      short: 'f',
      type: 'boolean',
      description: 'Skip confirmation',
      default: false,
    },
  ],
  examples: [
    'uni gcontacts delete "John Doe"',
    'uni gcontacts delete "old@email.com" --force',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

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
      const name = gcontacts.getDisplayName(contact);
      spinner.success(`Found: ${name}`);

      // Confirm unless --force
      if (!flags.force) {
        const readline = await import('node:readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(c.yellow(`Delete "${name}"? [y/N] `), resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'y') {
          output.info('Cancelled');
          return;
        }
      }

      const deleteSpinner = output.spinner('Deleting...');
      await gcontacts.deleteContact(contact.resourceName);
      deleteSpinner.success('Contact deleted');

      if (globalFlags.json) {
        output.json({ deleted: contact.resourceName, name });
      }
    } catch (error) {
      spinner.fail('Failed to delete contact');
      throw error;
    }
  },
};
