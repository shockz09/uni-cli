/**
 * uni arxiv author - Search papers by author
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { searchByAuthor } from '../api';

export const authorCommand: Command = {
  name: 'author',
  aliases: ['au', 'a'],
  description: 'Search papers by author name',
  args: [
    { name: 'name', description: 'Author name to search', required: true },
  ],
  options: [
    { name: 'limit', short: 'n', type: 'number', description: 'Number of results (default: 10)' },
  ],
  examples: [
    'uni arxiv author "Yann LeCun"',
    'uni arxiv author "Geoffrey Hinton" -n 20',
    'uni arxiv author Bengio',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const name = args.name as string;
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner(`Searching papers by "${name}"...`);

    try {
      const papers = await searchByAuthor(name, limit);
      spinner.stop();

      if (globalFlags.json) {
        output.json(papers);
        return;
      }

      if (papers.length === 0) {
        output.info(`No papers found for author "${name}"`);
        return;
      }

      output.info('');
      output.info(c.bold(`Papers by "${name}" (${papers.length} results)`));
      output.info('');

      for (const paper of papers) {
        const date = paper.published.split('T')[0];
        const cats = paper.categories.slice(0, 2).join(', ');

        output.info(`  ${c.bold(paper.title)}`);
        output.info(`    ${c.dim(paper.authors.join(', '))}`);
        output.info(`    ${c.cyan(paper.id)} • ${date} • ${cats}`);
        output.info(`    ${paper.arxivUrl}`);
        output.info('');
      }
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
