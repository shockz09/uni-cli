/**
 * uni reddit new - Get new posts from a subreddit
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getSubredditPosts } from '../api';

export const newCommand: Command = {
  name: 'new',
  description: 'Get new posts from a subreddit',
  args: [
    {
      name: 'subreddit',
      description: 'Subreddit name (without r/)',
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
    'uni reddit new programming',
    'uni reddit new askscience -n 5',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const subreddit = args.subreddit as string;
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner(`Fetching r/${subreddit}...`);

    try {
      const posts = await getSubredditPosts(subreddit, 'new', 'day', limit);

      if (posts.length === 0) {
        spinner.fail('No posts found');
        return;
      }

      spinner.success(`r/${subreddit} - ${posts.length} new posts`);

      if (globalFlags.json) {
        output.json(posts);
        return;
      }

      console.log('');
      for (const post of posts) {
        const age = getAge(post.created);
        const comments = `${post.numComments} comments`;
        const flair = post.flair ? c.dim(` [${post.flair}]`) : '';

        console.log(`${c.dim(age.padEnd(6))} ${c.bold(post.title)}${flair}`);
        console.log(c.dim(`       ${comments} | u/${post.author} | ${post.permalink}`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch posts');
      throw error;
    }
  },
};

function getAge(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
}
