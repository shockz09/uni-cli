/**
 * uni hn ask - Get Ask HN posts
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getStories, timeAgo } from '../api';

export const askCommand: Command = {
  name: 'ask',
  description: 'Get Ask HN posts',
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
    'uni hn ask',
    'uni hn ask -n 5',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner('Fetching Ask HN...');

    try {
      const stories = await getStories('ask', limit);

      spinner.success(`${stories.length} Ask HN posts`);

      if (globalFlags.json) {
        output.json(stories);
        return;
      }

      console.log('');
      for (const story of stories) {
        const score = c.cyan(story.score.toString().padStart(4));
        const comments = story.descendants || 0;
        const time = timeAgo(story.time);

        console.log(`${score} ${c.bold(story.title)}`);
        console.log(c.dim(`      ${comments} comments | ${story.by} | ${time}`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch Ask HN');
      throw error;
    }
  },
};
