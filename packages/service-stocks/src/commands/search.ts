/**
 * uni stocks search - Search for stock symbols
 */

import type { Command, CommandContext } from '@uni/shared';
import { searchSymbols } from '../api';

export const searchCommand: Command = {
  name: 'search',
  aliases: ['find', 's'],
  description: 'Search for stock/crypto symbols by name',
  args: [
    { name: 'query', description: 'Company or crypto name to search', required: true },
  ],
  options: [
    { name: 'limit', short: 'n', type: 'number', description: 'Number of results (default: 10)' },
  ],
  examples: [
    'uni stocks search Apple',
    'uni stocks search "Bitcoin" -n 5',
    'uni stocks search Tesla',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const query = args.query as string;
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner(`Searching for "${query}"...`);

    try {
      const results = await searchSymbols(query, limit);
      spinner.stop();

      if (globalFlags.json) {
        output.json(results);
        return;
      }

      if (results.length === 0) {
        output.info(`No results found for "${query}"`);
        return;
      }

      output.info(`Found ${results.length} results for "${query}":\n`);

      for (const r of results) {
        output.info(`  ${r.symbol.padEnd(12)} ${r.name}`);
        output.info(`    ${r.type} • ${r.exchange}`);
      }
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
