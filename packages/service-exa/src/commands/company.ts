/**
 * uni exa company - Company research command
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { ExaMCPClient } from '../mcp-client';
import { ExaClient } from '../api';

export const companyCommand: Command = {
  name: 'company',
  description: 'Research a company',
  aliases: ['co', 'org'],
  args: [
    {
      name: 'name',
      description: 'Company name',
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
    'uni exa company "Anthropic"',
    'uni exa company "OpenAI" --num 10',
    'uni exa company "Stripe"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const companyName = args.name;
    if (!companyName) {
      output.error('Please provide a company name');
      return;
    }

    const spinner = output.spinner(`Researching ${companyName}...`);

    try {
      let results: Array<{ title: string; url: string; text?: string; publishedDate?: string }>;

      if (flags.api || process.env.EXA_API_KEY) {
        const client = new ExaClient();
        const response = await client.companyResearch(
          companyName,
          flags.num as number
        );
        results = response.results;
      } else {
        const mcpClient = new ExaMCPClient();
        results = await mcpClient.companyResearch(companyName, flags.num as number);
      }

      spinner.success(`Found ${results.length} results about ${companyName}`);

      if (globalFlags.json) {
        output.json({
          company: companyName,
          results,
        });
        return;
      }

      // Display company info
      console.log(`\n${c.bold(`🏢 ${companyName}`)}\n`);

      for (const result of results) {
        console.log(c.bold(result.title));
        console.log(c.cyan(result.url));
        if (result.text) {
          const snippet = result.text.slice(0, 250).replace(/\n/g, ' ');
          console.log(c.dim(`${snippet}${result.text.length > 250 ? '...' : ''}`));
        }
        if (result.publishedDate) {
          console.log(c.dim(`📅 ${result.publishedDate}`));
        }
        console.log('');
      }

    } catch (error) {
      spinner.fail('Company research failed');
      throw error;
    }
  },
};
