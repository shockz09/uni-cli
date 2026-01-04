/**
 * uni notion search - Search Notion
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { notion } from '../api';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search pages and databases',
  aliases: ['s', 'find'],
  args: [
    {
      name: 'query',
      description: 'Search query',
      required: true,
    },
  ],
  options: [
    {
      name: 'type',
      short: 't',
      type: 'string',
      description: 'Filter by type: page, database',
      choices: ['page', 'database'],
    },
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Maximum results',
      default: 10,
    },
  ],
  examples: [
    'uni notion search "meeting notes"',
    'uni notion search "projects" --type database',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!notion.hasToken()) {
      output.error('Notion token not configured. Set NOTION_TOKEN environment variable.');
      return;
    }

    const query = args.query;
    if (!query) {
      output.error('Please provide a search query');
      return;
    }

    const spinner = output.spinner(`Searching for "${query}"...`);

    try {
      const results = await notion.search(query, {
        filter: flags.type as 'page' | 'database' | undefined,
        pageSize: flags.limit as number,
      });

      spinner.success(`Found ${results.length} results`);

      if (globalFlags.json) {
        output.json(results);
        return;
      }

      if (results.length === 0) {
        console.log(c.dim('No results found'));
        return;
      }

      console.log('');
      for (const result of results) {
        const icon = result.object === 'database' ? '📊' : '📄';
        console.log(`${icon} ${c.bold(result.title || 'Untitled')}`);
        console.log(`   ${c.cyan(result.url)}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
