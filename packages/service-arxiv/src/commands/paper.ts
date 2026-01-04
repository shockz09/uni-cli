/**
 * uni arxiv paper - Get paper details by ID
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getPaper } from '../api';

export const paperCommand: Command = {
  name: 'paper',
  description: 'Get paper details by arXiv ID',
  args: [
    {
      name: 'id',
      description: 'arXiv paper ID (e.g., 2401.12345)',
      required: true,
    },
  ],
  examples: [
    'uni arxiv paper 2401.12345',
    'uni arxiv paper 1706.03762',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    const id = args.id as string;

    const spinner = output.spinner('Fetching paper...');

    try {
      const paper = await getPaper(id);

      if (!paper) {
        spinner.fail('Paper not found');
        output.error(`No paper found with ID: ${id}`);
        return;
      }

      spinner.success('Paper found');

      if (globalFlags.json) {
        output.json(paper);
        return;
      }

      console.log('');
      console.log(c.bold(paper.title));
      console.log('');

      // Authors
      console.log(c.cyan('Authors:'));
      console.log(`  ${paper.authors.join(', ')}`);
      console.log('');

      // Dates
      const published = new Date(paper.published).toLocaleDateString();
      const updated = new Date(paper.updated).toLocaleDateString();
      console.log(c.cyan('Published:') + ` ${published}`);
      if (published !== updated) {
        console.log(c.cyan('Updated:') + ` ${updated}`);
      }
      console.log('');

      // Categories
      console.log(c.cyan('Categories:') + ` ${paper.categories.join(', ')}`);
      if (paper.doi) {
        console.log(c.cyan('DOI:') + ` ${paper.doi}`);
      }
      console.log('');

      // Abstract
      console.log(c.cyan('Abstract:'));
      console.log(c.dim(paper.summary));
      console.log('');

      // Links
      console.log(c.cyan('Links:'));
      console.log(`  arXiv: ${paper.arxivUrl}`);
      console.log(`  PDF:   ${paper.pdfUrl}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch paper');
      throw error;
    }
  },
};
