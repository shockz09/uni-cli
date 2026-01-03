/**
 * uni exa code - Code context search command
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { ExaMCPClient } from '../mcp-client';
import { ExaClient } from '../api';

export const codeCommand: Command = {
  name: 'code',
  description: 'Get code context and documentation',
  aliases: ['docs', 'context'],
  args: [
    {
      name: 'query',
      description: 'Code/documentation query',
      required: true,
    },
  ],
  options: [
    {
      name: 'tokens',
      short: 't',
      type: 'number',
      description: 'Max tokens to return',
      default: 5000,
    },
    {
      name: 'api',
      type: 'boolean',
      description: 'Use direct API instead of MCP (requires EXA_API_KEY)',
      default: false,
    },
  ],
  examples: [
    'uni exa code "Express.js middleware authentication"',
    'uni exa code "Python pandas groupby aggregate"',
    'uni exa code "React useEffect cleanup" --tokens 10000',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const query = args.query;
    if (!query) {
      output.error('Please provide a code/documentation query');
      return;
    }

    const spinner = output.spinner(`Finding code context for "${query}"...`);

    try {
      let response: { context: string; sources: Array<{ title: string; url: string }> };

      if (flags.api || process.env.EXA_API_KEY) {
        const client = new ExaClient();
        response = await client.codeContext(query, {
          tokensNum: flags.tokens as number,
        });
      } else {
        const mcpClient = new ExaMCPClient();
        response = await mcpClient.codeContext(query, {
          tokensNum: flags.tokens as number,
        });
      }

      spinner.success(response.sources.length ? `Found ${response.sources.length} sources` : 'Found code context');

      if (globalFlags.json) {
        output.json(response);
        return;
      }

      // Display sources first
      console.log(`\n${c.bold('Sources:')}`);
      for (const source of response.sources) {
        console.log(`  • ${c.cyan(source.title)}`);
        console.log(`    ${source.url}`);
      }

      // Display context
      console.log(`\n${c.bold('─── Context ───')}\n`);
      console.log(response.context);

    } catch (error) {
      spinner.fail('Code context search failed');
      throw error;
    }
  },
};
