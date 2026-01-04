/**
 * uni reddit hot - Get hot posts from a subreddit
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getSubredditPosts } from '../api';

export const hotCommand: Command = {
  name: 'hot',
  description: 'Get hot posts from a subreddit',
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
    'uni reddit hot programming',
    'uni reddit hot rust -n 5',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const subreddit = args.subreddit as string;
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner(`Fetching r/${subreddit}...`);

    try {
      const posts = await getSubredditPosts(subreddit, 'hot', 'day', limit);

      if (posts.length === 0) {
        spinner.fail('No posts found');
        return;
      }

      spinner.success(`r/${subreddit} - ${posts.length} hot posts`);

      if (globalFlags.json) {
        output.json(posts);
        return;
      }

      console.log('');
      for (const post of posts) {
        const score = post.score.toString().padStart(5);
        const comments = `${post.numComments} comments`;
        const flair = post.flair ? c.dim(` [${post.flair}]`) : '';

        console.log(`${c.cyan(score)} ${c.bold(post.title)}${flair}`);
        console.log(c.dim(`       ${comments} | u/${post.author} | ${post.permalink}`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch posts');
      throw error;
    }
  },
};
