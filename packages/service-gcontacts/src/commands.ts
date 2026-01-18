/**
 * Google Contacts Commands
 *
 * Consolidated command definitions for gcontacts service.
 */

import type { Command, CommandContext } from '@uni/shared';
import { c, createGoogleAuthCommand } from '@uni/shared';
import { gcontacts } from './api';

// ============================================================
// Auth Command
// ============================================================

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Contacts',
  serviceKey: 'gcontacts',
  client: gcontacts,
});

// ============================================================
// List Command
// ============================================================

const listCommand: Command = {
  name: 'list',
  description: 'List contacts',
  aliases: ['ls'],
  options: [
    { name: 'limit', short: 'l', type: 'number', description: 'Max contacts', default: 20 },
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
        console.log(c.dim('No contacts'));
        return;
      }

      console.log('');
      for (const contact of contacts) {
        const name = gcontacts.getDisplayName(contact);
        const email = gcontacts.getEmail(contact);
        const phone = gcontacts.getPhone(contact);
        const company = gcontacts.getCompany(contact);

        console.log(`  ${c.bold(name)}`);
        if (email) console.log(`    ${c.cyan(email)}`);
        if (phone) console.log(`    ${c.dim(phone)}`);
        if (company) console.log(`    ${c.dim(company)}`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch contacts');
      throw error;
    }
  },
};

// ============================================================
// Search Command
// ============================================================

const searchCommand: Command = {
  name: 'search',
  description: 'Search contacts',
  aliases: ['s', 'find'],
  args: [{ name: 'query', description: 'Search query (name, email, phone)', required: true }],
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
        console.log(c.dim('No contacts found'));
        return;
      }

      console.log('');
      for (const contact of contacts) {
        const name = gcontacts.getDisplayName(contact);
        const email = gcontacts.getEmail(contact);
        const phone = gcontacts.getPhone(contact);
        const company = gcontacts.getCompany(contact);

        console.log(`  ${c.bold(name)}`);
        if (email) console.log(`    ${c.cyan(email)}`);
        if (phone) console.log(`    ${c.dim(phone)}`);
        if (company) console.log(`    ${c.dim(company)}`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};

// ============================================================
// Get Command
// ============================================================

const getCommand: Command = {
  name: 'get',
  description: 'Get contact details',
  aliases: ['view', 'show'],
  args: [{ name: 'query', description: 'Contact name or email', required: true }],
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
      console.log(`  ${c.bold(name)}`);

      if (emails.length > 0) {
        console.log('');
        console.log(`  ${c.dim('Emails:')}`);
        for (const email of emails) {
          const type = email.type ? ` (${email.type})` : '';
          console.log(`    ${c.cyan(email.value)}${type}`);
        }
      }

      if (phones.length > 0) {
        console.log('');
        console.log(`  ${c.dim('Phones:')}`);
        for (const phone of phones) {
          const type = phone.type ? ` (${phone.type})` : '';
          console.log(`    ${phone.value}${type}`);
        }
      }

      if (company) {
        console.log('');
        console.log(`  ${c.dim('Company:')} ${company}`);
      }

      console.log('');
    } catch (error) {
      spinner.fail('Failed to get contact');
      throw error;
    }
  },
};

// ============================================================
// Add Command
// ============================================================

const addCommand: Command = {
  name: 'add',
  description: 'Add a new contact',
  aliases: ['new', 'create'],
  args: [{ name: 'name', description: 'Contact name', required: true }],
  options: [
    { name: 'email', short: 'e', type: 'string', description: 'Email address' },
    { name: 'phone', short: 'p', type: 'string', description: 'Phone number' },
    { name: 'company', short: 'c', type: 'string', description: 'Company name' },
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

// ============================================================
// Update Command
// ============================================================

const updateCommand: Command = {
  name: 'update',
  description: 'Update a contact',
  aliases: ['edit', 'modify'],
  args: [{ name: 'search', description: 'Contact name to search for', required: true }],
  options: [
    { name: 'name', short: 'n', type: 'string', description: 'New name' },
    { name: 'email', short: 'e', type: 'string', description: 'New email' },
    { name: 'phone', short: 'p', type: 'string', description: 'New phone' },
    { name: 'company', short: 'c', type: 'string', description: 'New company' },
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

// ============================================================
// Delete Command
// ============================================================

const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a contact',
  aliases: ['rm', 'remove'],
  args: [{ name: 'query', description: 'Contact name or email', required: true }],
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

// ============================================================
// Batch Delete Command
// ============================================================

const batchDeleteCommand: Command = {
  name: 'batch-delete',
  description: 'Delete multiple contacts at once',
  args: [{ name: 'resourceNames', description: 'Contact resource names (comma-separated)', required: true }],
  examples: [
    'uni gcontacts batch-delete "people/123,people/456,people/789"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gcontacts.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcontacts auth" first.');
      return;
    }

    const resourceNames = (args.resourceNames as string).split(',').map(r => r.trim());

    if (resourceNames.length === 0) {
      output.error('No resource names provided');
      return;
    }

    const spinner = output.spinner(`Deleting ${resourceNames.length} contact(s)...`);
    try {
      await gcontacts.batchDelete(resourceNames);
      spinner.success(`Deleted ${resourceNames.length} contact(s)`);

      if (globalFlags.json) {
        output.json({ deleted: resourceNames });
      }
    } catch (error) {
      spinner.fail('Failed to delete contacts');
      throw error;
    }
  },
};

// ============================================================
// Export Command
// ============================================================

const exportCommand: Command = {
  name: 'export',
  description: 'Export contacts as vCard format',
  options: [
    { name: 'limit', short: 'n', type: 'string', description: 'Number of contacts to export (default: 100)' },
  ],
  examples: [
    'uni gcontacts export',
    'uni gcontacts export --limit 50',
    'uni gcontacts export > contacts.vcf',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gcontacts.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcontacts auth" first.');
      return;
    }

    const limit = parseInt((flags.limit as string) || '100', 10);

    const spinner = output.spinner('Exporting contacts...');
    try {
      const vcfData = await gcontacts.exportContacts(limit);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ format: 'vcard', data: vcfData });
        return;
      }

      output.info(vcfData);
    } catch (error) {
      spinner.fail('Failed to export contacts');
      throw error;
    }
  },
};

// ============================================================
// Groups Command
// ============================================================

const groupsCommand: Command = {
  name: 'groups',
  aliases: ['group'],
  description: 'List and manage contact groups',
  options: [
    { name: 'create', short: 'c', type: 'string', description: 'Create a new group' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete a group by resource name' },
    { name: 'add-contact', short: 'a', type: 'string', description: 'Add contact to group (requires --group)' },
    { name: 'remove-contact', short: 'r', type: 'string', description: 'Remove contact from group (requires --group)' },
    { name: 'group', short: 'g', type: 'string', description: 'Group resource name for add/remove operations' },
  ],
  examples: [
    'uni gcontacts groups',
    'uni gcontacts groups --create "Work Colleagues"',
    'uni gcontacts groups --delete contactGroups/123',
    'uni gcontacts groups --add-contact people/123 --group contactGroups/456',
    'uni gcontacts groups --remove-contact people/123 --group contactGroups/456',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gcontacts.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gcontacts auth" first.');
      return;
    }

    // Create group
    if (flags.create) {
      const spinner = output.spinner('Creating group...');
      try {
        const group = await gcontacts.createGroup(flags.create as string);
        spinner.success(`Created group: ${group.name}`);
        if (globalFlags.json) output.json(group);
        else output.info(`  Resource: ${group.resourceName}`);
        return;
      } catch (error) {
        spinner.fail('Failed to create group');
        throw error;
      }
    }

    // Delete group
    if (flags.delete) {
      const spinner = output.spinner('Deleting group...');
      try {
        await gcontacts.deleteGroup(flags.delete as string);
        spinner.success('Group deleted');
        return;
      } catch (error) {
        spinner.fail('Failed to delete group');
        throw error;
      }
    }

    // Add contact to group
    if (flags['add-contact'] && flags.group) {
      const spinner = output.spinner('Adding contact to group...');
      try {
        await gcontacts.addToGroup(flags['add-contact'] as string, flags.group as string);
        spinner.success('Contact added to group');
        return;
      } catch (error) {
        spinner.fail('Failed to add contact to group');
        throw error;
      }
    }

    // Remove contact from group
    if (flags['remove-contact'] && flags.group) {
      const spinner = output.spinner('Removing contact from group...');
      try {
        await gcontacts.removeFromGroup(flags['remove-contact'] as string, flags.group as string);
        spinner.success('Contact removed from group');
        return;
      } catch (error) {
        spinner.fail('Failed to remove contact from group');
        throw error;
      }
    }

    // List groups
    const spinner = output.spinner('Fetching groups...');
    try {
      const groups = await gcontacts.listGroups();
      spinner.stop();

      if (globalFlags.json) {
        output.json(groups);
        return;
      }

      if (groups.length === 0) {
        output.info('No contact groups found.');
        return;
      }

      output.info(`Contact Groups (${groups.length}):\n`);
      for (const group of groups) {
        const count = group.memberCount !== undefined ? ` (${group.memberCount} members)` : '';
        output.info(`  ${group.name}${count}`);
        output.info(`    ${group.resourceName}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch groups');
      throw error;
    }
  },
};

// ============================================================
// Export All Commands
// ============================================================

export const commands: Command[] = [
  listCommand,
  searchCommand,
  getCommand,
  addCommand,
  updateCommand,
  deleteCommand,
  groupsCommand,
  exportCommand,
  batchDeleteCommand,
  authCommand,
];
