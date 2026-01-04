/**
 * uni hn search - Search Hacker News
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { searchHN } from '../api';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search Hacker News (via Algolia)',
  args: [
    {
      name: 'query',
      description: 'Search query',
      required: true,
    },
  ],
  options: [
    {
      name: 'sort',
      short: 's',
      type: 'string',
      description: 'Sort by: relevance or date',
      default: 'relevance',
    },
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Max results (default: 10)',
      default: 10,
    },
  ],
  examples: [
    'uni hn search "rust programming"',
    'uni hn search "ai agents" --sort date',
    'uni hn search "typescript" -n 5',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const query = args.query as string;
    const sortBy = (flags.sort as 'relevance' | 'date') || 'relevance';
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner('Searching Hacker News...');

    try {
      const hits = await searchHN(query, { sortBy, limit });

      if (hits.length === 0) {
        spinner.fail('No results found');
        return;
      }

      spinner.success(`Found ${hits.length} results`);

      if (globalFlags.json) {
        output.json(hits);
        return;
      }

      console.log('');
      for (const hit of hits) {
        const score = c.cyan((hit.points || 0).toString().padStart(4));
        const comments = hit.num_comments || 0;
        const date = new Date(hit.created_at).toLocaleDateString();

        console.log(`${score} ${c.bold(hit.title)}`);
        console.log(c.dim(`      ${comments} comments | ${hit.author} | ${date}`));
        if (hit.url) {
          console.log(c.dim(`      ${hit.url}`));
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
