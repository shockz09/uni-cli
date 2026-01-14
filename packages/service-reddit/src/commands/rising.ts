/**
 * uni reddit rising - Get rising posts from a subreddit
 */

import type { Command, CommandContext } from '@uni/shared';
import { getSubredditPosts } from '../api';

export const risingCommand: Command = {
  name: 'rising',
  aliases: ['rise'],
  description: 'Get rising posts from a subreddit',
  args: [
    { name: 'subreddit', description: 'Subreddit name (without r/)', required: true },
  ],
  options: [
    { name: 'limit', short: 'n', type: 'string', description: 'Number of posts (default: 10)' },
  ],
  examples: [
    'uni reddit rising programming',
    'uni reddit rising AskReddit -n 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const subreddit = args.subreddit as string;
    const limit = parseInt((flags.limit as string) || '10', 10);

    const spinner = output.spinner(`Fetching rising posts from r/${subreddit}...`);

    try {
      const posts = await getSubredditPosts(subreddit, 'rising', 'day', limit);
      spinner.stop();

      if (globalFlags.json) {
        output.json(posts);
        return;
      }

      if (posts.length === 0) {
        output.info('No rising posts found.');
        return;
      }

      output.info(`Rising in r/${subreddit} (${posts.length} posts):\n`);
      for (const post of posts) {
        const flair = post.flair ? ` [${post.flair}]` : '';
        const nsfw = post.isNsfw ? ' [NSFW]' : '';
        output.info(`  [${post.score}] ${post.title}${flair}${nsfw}`);
        output.info(`    by u/${post.author} • ${post.numComments} comments`);
        output.info(`    ${post.permalink}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch rising posts');
      throw error;
    }
  },
};
