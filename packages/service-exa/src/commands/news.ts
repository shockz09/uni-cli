/**
 * uni exa news - Search for recent news
 */

import type { Command, CommandContext } from '@uni/shared';
import { ExaClient } from '../api';

export const newsCommand: Command = {
  name: 'news',
  aliases: ['headlines', 'recent'],
  description: 'Search for recent news articles',
  args: [
    { name: 'query', description: 'News topic to search', required: true },
  ],
  options: [
    { name: 'num', short: 'n', type: 'string', description: 'Number of results (default: 10)' },
    { name: 'days', short: 'd', type: 'string', description: 'Days back to search (default: 7)' },
  ],
  examples: [
    'uni exa news "AI developments"',
    'uni exa news "tech layoffs" --num 20',
    'uni exa news "cryptocurrency" --days 3',
    'uni exa news "climate change" --days 30 --num 15',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const query = args.query as string;
    const numResults = parseInt((flags.num as string) || '10', 10);
    const daysBack = parseInt((flags.days as string) || '7', 10);

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startPublishedDate = startDate.toISOString().split('T')[0];

    const exa = new ExaClient();
    const spinner = output.spinner('Searching news...');

    try {
      const results = await exa.search(query, {
        numResults,
        startPublishedDate,
        category: 'news',
      });
      spinner.stop();

      if (globalFlags.json) {
        output.json(results);
        return;
      }

      if (results.results.length === 0) {
        output.info('No news articles found.');
        return;
      }

      output.info(`News: "${query}" (last ${daysBack} days)\n`);
      output.info(`Found ${results.results.length} articles:\n`);

      for (const result of results.results) {
        const date = result.publishedDate ? new Date(result.publishedDate).toLocaleDateString() : '';
        output.info(`  ${result.title}`);
        output.info(`    ${result.url}`);
        if (date) {
          output.info(`    ${date}${result.author ? ` • ${result.author}` : ''}`);
        }
        if (result.text) {
          const preview = result.text.slice(0, 120).replace(/\n/g, ' ');
          output.info(`    ${preview}...`);
        }
        output.info('');
      }
    } catch (error) {
      spinner.fail('Failed to search news');
      throw error;
    }
  },
};
