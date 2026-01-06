/**
 * uni wa contacts - List contacts
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated, formatJid } from '../client';

export const contactsCommand: Command = {
  name: 'contacts',
  description: 'List WhatsApp contacts',
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Number of contacts (default: 50)',
      default: 50,
    },
  ],
  examples: [
    'uni wa contacts',
    'uni wa contacts -n 100',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;
    const limit = (flags.limit as number) || 50;

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run "uni wa auth" first.');
      return;
    }

    const spinner = output.spinner('Loading contacts...');

    try {
      const sock = await createClient();
      if (!sock) {
        spinner.fail('Failed to connect');
        return;
      }

      // Wait for contacts to load
      const contacts = await new Promise<Record<string, any>>((resolve) => {
        const timeout = setTimeout(() => resolve({}), 10000);

        sock.ev.on('contacts.set', ({ contacts }) => {
          clearTimeout(timeout);
          const contactMap: Record<string, any> = {};
          for (const c of contacts) {
            contactMap[c.id] = c;
          }
          resolve(contactMap);
        });
      });

      await sock.end();

      const contactList = Object.values(contacts).slice(0, limit);
      spinner.success(`Found ${contactList.length} contact(s)`);

      if (globalFlags.json) {
        output.json(contactList.map((contact: any) => ({
          jid: contact.id,
          name: contact.name || contact.notify,
          phone: formatJid(contact.id),
        })));
        return;
      }

      console.log('');
      for (const contact of contactList) {
        const name = contact.name || contact.notify || formatJid(contact.id);
        const phone = formatJid(contact.id);

        console.log(`${c.bold(name)}`);
        console.log(`   ${c.dim(phone)}`);
        console.log(`   ${c.dim(contact.id)}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to load contacts');
      throw error;
    }
  },
};
