/**
 * uni arxiv search - Search arXiv papers
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { searchPapers } from '../api';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search arXiv papers',
  args: [
    {
      name: 'query',
      description: 'Search query',
      required: true,
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
  ],
  examples: [
    'uni arxiv search "transformer attention"',
    'uni arxiv search "reinforcement learning" -n 5',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const query = args.query as string;
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner('Searching arXiv...');

    try {
      const papers = await searchPapers(query, limit);

      if (papers.length === 0) {
        spinner.fail('No papers found');
        return;
      }

      spinner.success(`Found ${papers.length} papers`);

      if (globalFlags.json) {
        output.json(papers);
        return;
      }

      console.log('');
      for (const paper of papers) {
        const date = new Date(paper.published).toLocaleDateString();
        const authors = paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : '');

        console.log(c.bold(paper.title));
        console.log(c.dim(`  ${paper.id} | ${date} | ${authors}`));
        console.log(c.cyan(`  ${paper.arxivUrl}`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
