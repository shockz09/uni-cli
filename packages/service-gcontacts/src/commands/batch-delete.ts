/**
 * uni gcontacts batch-delete - Delete multiple contacts
 */

import type { Command, CommandContext } from '@uni/shared';
import { gcontacts } from '../api';

export const batchDeleteCommand: Command = {
  name: 'batch-delete',
  description: 'Delete multiple contacts at once',
  args: [
    { name: 'resourceNames', description: 'Contact resource names (comma-separated)', required: true },
  ],
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
