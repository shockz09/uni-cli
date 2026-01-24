/**
 * uni exa linkedin - LinkedIn profile search command
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { ExaMCPClient } from '../mcp-client';

export const linkedinCommand: Command = {
  name: 'linkedin',
  description: 'Search for people on LinkedIn',
  aliases: ['li', 'people'],
  args: [
    {
      name: 'query',
      description: 'Search query (name, role, company)',
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
  ],
  examples: [
    'uni exa linkedin "Dario Amodei Anthropic"',
    'uni exa linkedin "CTO startup San Francisco"',
    'uni exa linkedin "machine learning engineer Google" --num 10',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const query = args.query;
    if (!query) {
      output.error('Please provide a search query');
      return;
    }

    const spinner = output.spinner(`Searching LinkedIn for "${query}"...`);

    try {
      const mcpClient = new ExaMCPClient();
      const results = await mcpClient.linkedinSearch(query as string, flags.num as number);

      spinner.success(`Found ${results.length} LinkedIn profiles`);

      if (globalFlags.json) {
        output.json({
          query,
          results,
        });
        return;
      }

      console.log(`\n${c.bold(`👥 LinkedIn Results for "${query}"`)}\n`);

      for (const result of results) {
        console.log(c.bold(result.title));
        console.log(c.cyan(result.url));
        if (result.text) {
          const snippet = result.text.slice(0, 200).replace(/\n/g, ' ');
          console.log(c.dim(`${snippet}${result.text.length > 200 ? '...' : ''}`));
        }
        console.log('');
      }

    } catch (error) {
      spinner.fail('LinkedIn search failed');
      throw error;
    }
  },
};
