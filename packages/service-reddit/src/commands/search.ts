/**
 * uni reddit search - Search Reddit
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { searchReddit } from '../api';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search Reddit posts',
  args: [
    {
      name: 'query',
      description: 'Search query',
      required: true,
    },
  ],
  options: [
    {
      name: 'subreddit',
      short: 'r',
      type: 'string',
      description: 'Limit to subreddit',
    },
    {
      name: 'sort',
      short: 's',
      type: 'string',
      description: 'Sort: relevance, hot, top, new',
      default: 'relevance',
    },
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Max results (default: 10)',
      default: 10,
    },
  ],
  examples: [
    'uni reddit search "ai agents"',
    'uni reddit search "typescript tips" -r programming',
    'uni reddit search "rust vs go" --sort top -n 5',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const query = args.query as string;
    const subreddit = flags.subreddit as string | undefined;
    const sort = (flags.sort as 'relevance' | 'hot' | 'top' | 'new') || 'relevance';
    const limit = (flags.limit as number) || 10;

    const spinner = output.spinner('Searching Reddit...');

    try {
      const posts = await searchReddit(query, subreddit, sort, limit);

      if (posts.length === 0) {
        spinner.fail('No posts found');
        return;
      }

      spinner.success(`Found ${posts.length} posts`);

      if (globalFlags.json) {
        output.json(posts);
        return;
      }

      console.log('');
      for (const post of posts) {
        const score = post.score.toString().padStart(5);
        const sub = c.dim(`r/${post.subreddit}`);

        console.log(`${c.cyan(score)} ${c.bold(post.title)}`);
        console.log(c.dim(`       ${sub} | u/${post.author} | ${post.permalink}`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
