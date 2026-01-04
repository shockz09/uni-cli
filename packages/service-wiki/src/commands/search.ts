/**
 * uni wiki search - Search Wikipedia
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { searchWiki } from '../api';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search Wikipedia articles',
  args: [
    {
      name: 'query',
      description: 'Search query',
      required: true,
    },
  ],
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Max results (default: 10)',
      default: 10,
    },
  ],
  examples: [
    'uni wiki search "quantum computing"',
    'uni wiki search "machine learning" -n 5',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const query = args.query as string;
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner('Searching Wikipedia...');

    try {
      const results = await searchWiki(query, limit);

      if (results.length === 0) {
        spinner.fail('No results found');
        return;
      }

      spinner.success(`Found ${results.length} articles`);

      if (globalFlags.json) {
        output.json(results);
        return;
      }

      console.log('');
      for (const result of results) {
        console.log(c.bold(result.title));
        console.log(c.dim(`  ${result.snippet.slice(0, 150)}...`));
        console.log(c.cyan(`  ${result.url}`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
