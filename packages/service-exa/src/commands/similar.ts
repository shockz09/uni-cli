/**
 * uni exa similar - Find similar content to a URL
 */

import type { Command, CommandContext } from '@uni/shared';
import { ExaClient } from '../api';

export const similarCommand: Command = {
  name: 'similar',
  aliases: ['like', 'related'],
  description: 'Find content similar to a given URL',
  args: [
    { name: 'url', description: 'URL to find similar content for', required: true },
  ],
  options: [
    { name: 'num', short: 'n', type: 'string', description: 'Number of results (default: 5)' },
    { name: 'include', short: 'i', type: 'string', description: 'Include domains (comma-separated)' },
    { name: 'exclude', short: 'e', type: 'string', description: 'Exclude domains (comma-separated)' },
  ],
  examples: [
    'uni exa similar "https://example.com/article"',
    'uni exa similar "https://blog.com/post" --num 10',
    'uni exa similar "https://news.com/story" --exclude "reddit.com,twitter.com"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const url = args.url as string;
    const numResults = parseInt((flags.num as string) || '5', 10);
    const includeDomains = flags.include ? (flags.include as string).split(',').map(d => d.trim()) : undefined;
    const excludeDomains = flags.exclude ? (flags.exclude as string).split(',').map(d => d.trim()) : undefined;

    const exa = new ExaClient();
    const spinner = output.spinner('Finding similar content...');

    try {
      const results = await exa.findSimilar(url, { numResults, includeDomains, excludeDomains });
      spinner.stop();

      if (globalFlags.json) {
        output.json(results);
        return;
      }

      if (results.results.length === 0) {
        output.info('No similar content found.');
        return;
      }

      output.info(`Similar to: ${url}\n`);
      output.info(`Found ${results.results.length} similar pages:\n`);

      for (const result of results.results) {
        output.info(`  ${result.title}`);
        output.info(`    ${result.url}`);
        if (result.publishedDate) {
          output.info(`    Published: ${result.publishedDate}`);
        }
        if (result.text) {
          const preview = result.text.slice(0, 150).replace(/\n/g, ' ');
          output.info(`    ${preview}...`);
        }
        output.info('');
      }
    } catch (error) {
      spinner.fail('Failed to find similar content');
      throw error;
    }
  },
};
