/**
 * uni gmail labels - Manage labels
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const labelsCommand: Command = {
  name: 'labels',
  description: 'List and manage labels',
  options: [
    { name: 'create', short: 'c', type: 'string', description: 'Create a new label' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete a label by ID' },
    { name: 'add', short: 'a', type: 'string', description: 'Add label to message (requires --message)' },
    { name: 'remove', short: 'r', type: 'string', description: 'Remove label from message (requires --message)' },
    { name: 'message', short: 'm', type: 'string', description: 'Message ID for add/remove operations' },
  ],
  examples: [
    'uni gmail labels',
    'uni gmail labels --create "Important/Work"',
    'uni gmail labels --delete Label_123',
    'uni gmail labels --add Label_123 --message MSG_ID',
    'uni gmail labels --remove Label_123 --message MSG_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    // Create label
    if (flags.create) {
      const spinner = output.spinner('Creating label...');
      try {
        const label = await gmail.createLabel(flags.create as string);
        spinner.success(`Created label: ${label.name}`);
        if (globalFlags.json) output.json(label);
        return;
      } catch (error) {
        spinner.fail('Failed to create label');
        throw error;
      }
    }

    // Delete label
    if (flags.delete) {
      const spinner = output.spinner('Deleting label...');
      try {
        await gmail.deleteLabel(flags.delete as string);
        spinner.success('Label deleted');
        return;
      } catch (error) {
        spinner.fail('Failed to delete label');
        throw error;
      }
    }

    // Add label to message
    if (flags.add && flags.message) {
      const spinner = output.spinner('Adding label...');
      try {
        await gmail.addLabels(flags.message as string, [flags.add as string]);
        spinner.success('Label added to message');
        return;
      } catch (error) {
        spinner.fail('Failed to add label');
        throw error;
      }
    }

    // Remove label from message
    if (flags.remove && flags.message) {
      const spinner = output.spinner('Removing label...');
      try {
        await gmail.removeLabels(flags.message as string, [flags.remove as string]);
        spinner.success('Label removed from message');
        return;
      } catch (error) {
        spinner.fail('Failed to remove label');
        throw error;
      }
    }

    // List labels
    const spinner = output.spinner('Fetching labels...');
    try {
      const labels = await gmail.listLabels();
      spinner.stop();

      if (globalFlags.json) {
        output.json(labels);
        return;
      }

      const userLabels = labels.filter(l => l.type === 'user');
      const systemLabels = labels.filter(l => l.type === 'system');

      output.log('System Labels:');
      for (const label of systemLabels) {
        const unread = label.messagesUnread ? ` (${label.messagesUnread} unread)` : '';
        output.log(`  ${label.name}${unread}`);
      }

      output.log('\nUser Labels:');
      if (userLabels.length === 0) {
        output.log('  No custom labels');
      } else {
        for (const label of userLabels) {
          const unread = label.messagesUnread ? ` (${label.messagesUnread} unread)` : '';
          output.log(`  ${label.name}${unread}`);
          output.log(`    ID: ${label.id}`);
        }
      }
    } catch (error) {
      spinner.fail('Failed to fetch labels');
      throw error;
    }
  },
};
