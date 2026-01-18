/**
 * uni gslides versions - View presentation revision history
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const versionsCommand: Command = {
  name: 'versions',
  description: 'View presentation revision history',
  args: [
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'limit', alias: 'l', description: 'Max revisions to show (default: 10)', type: 'number' },
  ],
  examples: [
    'uni gslides versions PRES_ID',
    'uni gslides versions PRES_ID -l 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, options, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.presentation as string);
    const limit = (options.limit as number) || 10;

    const spinner = output.spinner('Fetching revisions...');

    try {
      const revisions = await gslides.getRevisions(presentationId, limit);
      spinner.stop();

      if (globalFlags.json) {
        output.json(revisions);
        return;
      }

      if (revisions.length === 0) {
        output.info('No revision history available.');
        return;
      }

      output.info('');
      output.info(c.bold('Revision History'));
      output.info('');

      for (const rev of revisions) {
        const date = new Date(rev.modifiedTime).toLocaleString();
        const user = rev.lastModifyingUser?.displayName || 'Unknown';
        output.info(`  ${c.dim(rev.id)} - ${c.cyan(date)}`);
        output.info(`    Modified by: ${user}`);
      }
      output.info('');
    } catch (error) {
      spinner.fail('Failed to fetch revisions');
      throw error;
    }
  },
};
