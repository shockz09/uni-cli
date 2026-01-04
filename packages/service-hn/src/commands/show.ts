/**
 * uni hn show - Get Show HN posts
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getStories, timeAgo } from '../api';

export const showCommand: Command = {
  name: 'show',
  description: 'Get Show HN posts',
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
    'uni hn show',
    'uni hn show -n 5',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner('Fetching Show HN...');

    try {
      const stories = await getStories('show', limit);

      spinner.success(`${stories.length} Show HN posts`);

      if (globalFlags.json) {
        output.json(stories);
        return;
      }

      console.log('');
      for (const story of stories) {
        const score = c.cyan(story.score.toString().padStart(4));
        const comments = story.descendants || 0;
        const domain = story.domain ? c.dim(` (${story.domain})`) : '';
        const time = timeAgo(story.time);

        console.log(`${score} ${c.bold(story.title)}${domain}`);
        console.log(c.dim(`      ${comments} comments | ${story.by} | ${time}`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch Show HN');
      throw error;
    }
  },
};
