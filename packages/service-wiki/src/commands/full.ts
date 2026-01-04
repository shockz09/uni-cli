/**
 * uni wiki full - Get full article content
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getFullArticle } from '../api';

export const fullCommand: Command = {
  name: 'full',
  description: 'Get full Wikipedia article',
  args: [
    {
      name: 'title',
      description: 'Article title',
      required: true,
    },
  ],
  examples: [
    'uni wiki full "Alan Turing"',
    'uni wiki full "Rust (programming language)"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    const title = args.title as string;

    const spinner = output.spinner('Fetching full article...');

    try {
      const article = await getFullArticle(title);

      if (!article) {
        spinner.fail('Article not found');
        output.error(`No Wikipedia article found for: ${title}`);
        return;
      }

      spinner.success('Article loaded');

      if (globalFlags.json) {
        output.json(article);
        return;
      }

      console.log('');
      console.log(c.bold(article.title));
      console.log('');

      // Show categories
      if (article.categories.length > 0) {
        console.log(c.dim(`Categories: ${article.categories.slice(0, 5).join(', ')}`));
        console.log('');
      }

      // Show content (truncated for readability)
      const content = article.extract;
      const maxLength = 3000;

      if (content.length > maxLength) {
        console.log(content.slice(0, maxLength));
        console.log('');
        console.log(c.dim(`... (${content.length - maxLength} more characters)`));
      } else {
        console.log(content);
      }

      console.log('');
      console.log(c.cyan(article.url));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch article');
      throw error;
    }
  },
};
