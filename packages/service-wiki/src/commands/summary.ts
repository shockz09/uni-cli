/**
 * uni wiki <title> - Get article summary (default command)
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getSummary } from '../api';

export const summaryCommand: Command = {
  name: '',  // Default command
  description: 'Get Wikipedia article summary',
  args: [
    {
      name: 'title',
      description: 'Article title',
      required: true,
    },
  ],
  examples: [
    'uni wiki "Alan Turing"',
    'uni wiki "Quantum computing"',
    'uni wiki "Rust (programming language)"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    const title = args.title as string;

    const spinner = output.spinner('Fetching article...');

    try {
      const summary = await getSummary(title);

      if (!summary) {
        spinner.fail('Article not found');
        output.error(`No Wikipedia article found for: ${title}`);
        return;
      }

      spinner.success('Article found');

      if (globalFlags.json) {
        output.json(summary);
        return;
      }

      console.log('');
      console.log(c.bold(summary.title));
      if (summary.description) {
        console.log(c.dim(summary.description));
      }
      console.log('');
      console.log(summary.extract);
      console.log('');
      console.log(c.cyan(summary.url));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch article');
      throw error;
    }
  },
};
