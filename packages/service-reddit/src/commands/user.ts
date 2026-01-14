/**
 * uni reddit user - View user profile and activity
 */

import type { Command, CommandContext } from '@uni/shared';
import { getUserInfo, getUserPosts, getUserComments } from '../api';

export const userCommand: Command = {
  name: 'user',
  aliases: ['u', 'profile'],
  description: 'View a Reddit user profile and activity',
  args: [
    { name: 'username', description: 'Reddit username', required: true },
  ],
  options: [
    { name: 'posts', short: 'p', type: 'boolean', description: 'Show recent posts' },
    { name: 'comments', short: 'c', type: 'boolean', description: 'Show recent comments' },
    { name: 'limit', short: 'n', type: 'string', description: 'Number of items (default: 5)' },
  ],
  examples: [
    'uni reddit user spez',
    'uni reddit user spez --posts',
    'uni reddit user spez --comments --limit 10',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const username = args.username as string;
    const showPosts = flags.posts as boolean;
    const showComments = flags.comments as boolean;
    const limit = parseInt((flags.limit as string) || '5', 10);

    const spinner = output.spinner(`Fetching user: ${username}...`);

    try {
      const user = await getUserInfo(username);
      spinner.stop();

      if (globalFlags.json && !showPosts && !showComments) {
        output.json(user);
        return;
      }

      const created = new Date(user.created).toLocaleDateString();
      output.info(`User: u/${user.name}`);
      output.info(`  Karma: ${user.totalKarma.toLocaleString()} (${user.linkKarma.toLocaleString()} post, ${user.commentKarma.toLocaleString()} comment)`);
      output.info(`  Joined: ${created}`);
      if (user.isGold) output.info(`  Reddit Premium: Yes`);
      if (user.isMod) output.info(`  Moderator: Yes`);
      if (user.description) output.info(`  Bio: ${user.description}`);

      // Show posts
      if (showPosts) {
        output.info('\nRecent Posts:');
        const posts = await getUserPosts(username, 'new', limit);

        if (globalFlags.json) {
          output.json({ user, posts });
          return;
        }

        for (const post of posts) {
          output.info(`  [${post.score}] ${post.title}`);
          output.info(`    r/${post.subreddit} • ${post.numComments} comments`);
        }
      }

      // Show comments
      if (showComments) {
        output.info('\nRecent Comments:');
        const comments = await getUserComments(username, 'new', limit);

        if (globalFlags.json) {
          output.json({ user, comments });
          return;
        }

        for (const comment of comments) {
          const preview = comment.body.slice(0, 80).replace(/\n/g, ' ');
          output.info(`  [${comment.score}] ${preview}${comment.body.length > 80 ? '...' : ''}`);
        }
      }
    } catch (error) {
      spinner.fail('Failed to fetch user');
      throw error;
    }
  },
};
