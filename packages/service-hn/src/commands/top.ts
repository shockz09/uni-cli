/**
 * uni hn top - Get top stories
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getStories, timeAgo } from '../api';

export const topCommand: Command = {
  name: 'top',
  description: 'Get top Hacker News stories',
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
    'uni hn top',
    'uni hn top -n 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner('Fetching top stories...');

    try {
      const stories = await getStories('top', limit);

      spinner.success(`${stories.length} top stories`);

      if (globalFlags.json) {
        output.json(stories);
        return;
      }

      console.log('');
      for (const story of stories) {
        printStory(story);
      }
    } catch (error) {
      spinner.fail('Failed to fetch stories');
      throw error;
    }
  },
};

function printStory(story: { id: number; title: string; url?: string; by: string; score: number; descendants: number; time: number; domain?: string }): void {
  const score = c.cyan(story.score.toString().padStart(4));
  const comments = story.descendants || 0;
  const domain = story.domain ? c.dim(` (${story.domain})`) : '';
  const time = timeAgo(story.time);

  console.log(`${score} ${c.bold(story.title)}${domain}`);
  console.log(c.dim(`      ${comments} comments | ${story.by} | ${time} | https://news.ycombinator.com/item?id=${story.id}`));
  console.log('');
}
