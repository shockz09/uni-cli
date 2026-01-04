/**
 * uni wiki random - Get a random article
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getRandomArticle } from '../api';

export const randomCommand: Command = {
  name: 'random',
  description: 'Get a random Wikipedia article',
  examples: [
    'uni wiki random',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, globalFlags } = ctx;

    const spinner = output.spinner('Fetching random article...');

    try {
      const article = await getRandomArticle();

      spinner.success('Random article');

      if (globalFlags.json) {
        output.json(article);
        return;
      }

      console.log('');
      console.log(c.bold(article.title));
      if (article.description) {
        console.log(c.dim(article.description));
      }
      console.log('');
      console.log(article.extract);
      console.log('');
      console.log(c.cyan(article.url));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch article');
      throw error;
    }
  },
};
