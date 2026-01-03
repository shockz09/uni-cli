/**
 * uni exa search - Web search command
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { ExaMCPClient } from '../mcp-client';
import { ExaClient } from '../api';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search the web for information',
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
      name: 'num',
      short: 'n',
      type: 'number',
      description: 'Number of results',
      default: 5,
    },
    {
      name: 'api',
      type: 'boolean',
      description: 'Use direct API instead of MCP (requires EXA_API_KEY)',
      default: false,
    },
  ],
  examples: [
    'uni exa search "React 19 server components"',
    'uni exa search "TypeScript 5.0 features" --num 10',
    'uni exa search "AI news" --api',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const query = args.query;
    if (!query) {
      output.error('Please provide a search query');
      return;
    }

    const spinner = output.spinner(`Searching for "${query}"...`);

    try {
      let results: Array<{ title: string; url: string; text?: string; publishedDate?: string }>;

      if (flags.api || process.env.EXA_API_KEY) {
        // Use direct API if --api flag or API key is set
        const client = new ExaClient();
        const response = await client.search(query, {
          numResults: flags.num as number,
        });
        results = response.results;
      } else {
        // Use MCP (default - no API key needed)
        const mcpClient = new ExaMCPClient();
        results = await mcpClient.search(query, {
          numResults: flags.num as number,
        });
      }

      spinner.success(`Found ${results.length} results`);

      if (globalFlags.json) {
        output.json({ results });
        return;
      }

      // Display results
      console.log('');
      for (const result of results) {
        console.log(c.bold(result.title));
        console.log(c.cyan(result.url));
        if (result.text) {
          const snippet = result.text.slice(0, 200).replace(/\n/g, ' ');
          console.log(c.dim(`${snippet}${result.text.length > 200 ? '...' : ''}`));
        }
        if (result.publishedDate) {
          console.log(c.dim(`Published: ${result.publishedDate}`));
        }
        console.log('');
      }

    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
