/**
 * uni hn new - Get new stories
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getStories, timeAgo } from '../api';

export const newCommand: Command = {
  name: 'new',
  description: 'Get newest Hacker News stories',
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
    'uni hn new',
    'uni hn new -n 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner('Fetching new stories...');

    try {
      const stories = await getStories('new', limit);

      spinner.success(`${stories.length} new stories`);

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
      spinner.fail('Failed to fetch stories');
      throw error;
    }
  },
};
