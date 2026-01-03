/**
 * uni exa research - Deep research command
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { ExaMCPClient } from '../mcp-client';
import { ExaClient } from '../api';
import { sleep } from '@uni/shared';

export const researchCommand: Command = {
  name: 'research',
  description: 'Perform research on a topic',
  aliases: ['r'],
  args: [
    {
      name: 'query',
      description: 'Research topic or question',
      required: true,
    },
  ],
  options: [
    {
      name: 'mode',
      short: 'm',
      type: 'string',
      description: 'Research mode: quick or deep',
      default: 'quick',
      choices: ['quick', 'deep'],
    },
    {
      name: 'num',
      short: 'n',
      type: 'number',
      description: 'Number of sources for quick mode',
      default: 8,
    },
    {
      name: 'api',
      type: 'boolean',
      description: 'Use direct API instead of MCP (requires EXA_API_KEY)',
      default: false,
    },
  ],
  examples: [
    'uni exa research "AI agent frameworks comparison 2025"',
    'uni exa research "best practices microservices" --mode deep',
    'uni exa research "React vs Vue 2025" --num 15',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const query = args.query;
    if (!query) {
      output.error('Please provide a research topic');
      return;
    }

    const mode = flags.mode as 'quick' | 'deep';
    const spinner = output.spinner(`Researching "${query}" (${mode} mode)...`);

    try {
      const useApi = flags.api || process.env.EXA_API_KEY;

      if (mode === 'quick') {
        // Quick mode: comprehensive search
        let results: Array<{ title: string; url: string; text?: string }>;

        if (useApi) {
          const client = new ExaClient();
          const response = await client.search(query, {
            numResults: flags.num as number,
            type: 'neural',
            useAutoprompt: true,
          });
          results = response.results;
        } else {
          const mcpClient = new ExaMCPClient();
          results = await mcpClient.search(query, {
            numResults: flags.num as number,
          });
        }

        spinner.success(`Research complete - ${results.length} sources`);

        if (globalFlags.json) {
          output.json({
            mode: 'quick',
            query,
            results,
          });
          return;
        }

        // Display research results
        console.log(`\n${c.bold('📚 Research Results')}\n`);

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          console.log(c.bold(`${i + 1}. ${result.title}`));
          console.log(`   ${c.cyan(result.url)}`);
          if (result.text) {
            const snippet = result.text.slice(0, 300).replace(/\n/g, ' ');
            console.log(`   ${c.dim(`${snippet}...`)}`);
          }
          console.log('');
        }

        output.info('For comprehensive analysis, use --mode deep');

      } else {
        // Deep mode: use research API
        spinner.update('Starting deep research...');

        if (useApi) {
          // Use direct API for deep research
          const client = new ExaClient();
          const { taskId } = await client.startResearch(query, 'deep');

          // Poll for results
          let attempts = 0;
          const maxAttempts = 60; // 2 minutes max

          while (attempts < maxAttempts) {
            const status = await client.checkResearch(taskId);

            if (status.status === 'completed') {
              spinner.success('Deep research complete');

              if (globalFlags.json) {
                output.json(status);
                return;
              }

              console.log(`\n${c.bold('🔬 Deep Research Results')}\n`);
              console.log(status.result);

              if (status.sources?.length) {
                console.log(`\n${c.bold('Sources:')}`);
                for (const source of status.sources) {
                  console.log(`  • ${source.title}`);
                  console.log(`    ${c.cyan(source.url)}`);
                }
              }
              return;
            }

            if (status.status === 'failed') {
              throw new Error('Research task failed');
            }

            spinner.update(`Researching... (${attempts * 2}s elapsed)`);
            await sleep(2000);
            attempts++;
          }

          spinner.fail('Research timed out');
          output.warn('Research is taking longer than expected. Try again later.');
        } else {
          // Use MCP for deep research
          const mcpClient = new ExaMCPClient();
          const result = await mcpClient.research(query, 'deep');

          spinner.success('Deep research complete');

          if (globalFlags.json) {
            output.json(result);
            return;
          }

          console.log(`\n${c.bold('🔬 Deep Research Results')}\n`);
          console.log(result.content || 'No content returned');
        }
      }

    } catch (error) {
      spinner.fail('Research failed');
      throw error;
    }
  },
};
