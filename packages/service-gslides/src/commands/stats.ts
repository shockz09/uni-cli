/**
 * uni gslides stats - Get presentation statistics
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const statsCommand: Command = {
  name: 'stats',
  description: 'Get presentation statistics',
  args: [
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
  ],
  examples: [
    'uni gslides stats PRES_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const presentationId = extractPresentationId(args.presentation as string);
    const spinner = output.spinner('Getting statistics...');

    try {
      const stats = await gslides.getStats(presentationId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(stats);
        return;
      }

      output.info('');
      output.info(c.bold('Presentation Statistics'));
      output.info(`  Slides:    ${c.cyan(stats.slides.toString())}`);
      output.info(`  Elements:  ${c.cyan(stats.elements.toString())}`);
      output.info(`  Text boxes: ${c.cyan(stats.textBoxes.toString())}`);
      output.info(`  Shapes:    ${c.cyan(stats.shapes.toString())}`);
      output.info('');
    } catch (error) {
      spinner.fail('Failed to get statistics');
      throw error;
    }
  },
};
