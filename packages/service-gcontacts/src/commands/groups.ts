/**
 * uni gcontacts groups - Manage contact groups
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcontacts } from '../api';

export const groupsCommand: Command = {
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
