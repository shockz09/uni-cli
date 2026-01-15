/**
 * uni wiki related - Get related Wikipedia articles
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getRelatedPages } from '../api';

export const relatedCommand: Command = {
  name: 'related',
  aliases: ['rel', 'similar'],
  description: 'Get related Wikipedia articles',
  args: [
    { name: 'title', description: 'Article title', required: true },
  ],
  options: [
    { name: 'limit', short: 'n', type: 'number', description: 'Number of results (default: 10)' },
  ],
  examples: [
    'uni wiki related "Albert Einstein"',
    'uni wiki related Python -n 20',
    'uni wiki related "Machine learning"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const title = args.title as string;
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner(`Finding articles related to "${title}"...`);

    try {
      const related = await getRelatedPages(title, limit);
      spinner.stop();

      if (globalFlags.json) {
        output.json(related);
        return;
      }

      if (related.length === 0) {
        output.info(`No related articles found for "${title}"`);
        return;
      }

      output.info('');
      output.info(c.bold(`Related to "${title}" (${related.length} articles)`));
      output.info('');

      for (const page of related) {
        output.info(`  ${c.bold(page.title)}`);
        if (page.extract) {
          const excerpt = page.extract.slice(0, 150).replace(/\n/g, ' ');
          output.info(`    ${c.dim(excerpt)}${page.extract.length > 150 ? '...' : ''}`);
        }
        output.info(`    ${c.cyan(page.url)}`);
        output.info('');
      }
    } catch (error) {
      spinner.fail('Failed to find related articles');
      throw error;
    }
  },
};
