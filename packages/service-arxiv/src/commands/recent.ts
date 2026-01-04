/**
 * uni arxiv recent - Get recent papers in a category
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getRecentPapers, CATEGORIES } from '../api';

export const recentCommand: Command = {
  name: 'recent',
  description: 'Get recent papers in a category',
  args: [
    {
      name: 'category',
      description: 'arXiv category (e.g., cs.AI, cs.LG)',
      required: false,
    },
  ],
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Max results (default: 10)',
      default: 10,
    },
    {
      name: 'list',
      short: 'l',
      type: 'boolean',
      description: 'List common categories',
    },
  ],
  examples: [
    'uni arxiv recent cs.AI',
    'uni arxiv recent cs.LG -n 5',
    'uni arxiv recent --list',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const category = args.category as string | undefined;
    const limit = (flags.limit as number) || 10;
    const listCategories = flags.list as boolean;

    if (listCategories || !category) {
      console.log('');
      console.log(c.bold('Common arXiv Categories:'));
      console.log('');
      for (const [code, name] of Object.entries(CATEGORIES)) {
        console.log(`  ${c.cyan(code.padEnd(12))} ${name}`);
      }
      console.log('');
      console.log(c.dim('Full list: https://arxiv.org/category_taxonomy'));
      console.log('');
      return;
    }

    const spinner = output.spinner(`Fetching recent ${category} papers...`);

    try {
      const papers = await getRecentPapers(category, limit);

      if (papers.length === 0) {
        spinner.fail('No papers found');
        output.error(`No recent papers in category: ${category}`);
        return;
      }

      spinner.success(`Found ${papers.length} recent papers`);

      if (globalFlags.json) {
        output.json(papers);
        return;
      }

      console.log('');
      for (const paper of papers) {
        const date = new Date(paper.published).toLocaleDateString();
        const authors = paper.authors.slice(0, 2).join(', ') + (paper.authors.length > 2 ? ' et al.' : '');

        console.log(c.bold(paper.title));
        console.log(c.dim(`  ${paper.id} | ${date} | ${authors}`));
        console.log(c.cyan(`  ${paper.arxivUrl}`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch papers');
      throw error;
    }
  },
};
