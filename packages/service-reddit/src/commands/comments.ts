/**
 * uni reddit comments - View comments on a post
 */

import type { Command, CommandContext } from '@uni/shared';
import { getPostById } from '../api';

export const commentsCommand: Command = {
  name: 'comments',
  aliases: ['c', 'discussion'],
  description: 'View comments on a Reddit post',
  args: [
    { name: 'postId', description: 'Post ID', required: true },
  ],
  options: [
    { name: 'limit', short: 'n', type: 'string', description: 'Number of top-level comments to show' },
  ],
  examples: [
    'uni reddit comments 1abc2de',
    'uni reddit comments 1abc2de --limit 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const postId = args.postId as string;
    const limit = parseInt((flags.limit as string) || '10', 10);

    const spinner = output.spinner('Fetching comments...');

    try {
      const result = await getPostById(postId);
      spinner.stop();

      if (!result) {
        output.error('Post not found');
        return;
      }

      const { post, comments } = result;
      const displayComments = comments.slice(0, limit);

      if (globalFlags.json) {
        output.json({ post, comments: displayComments });
        return;
      }

      output.info(`Post: ${post.title}`);
      output.info(`  by u/${post.author} in r/${post.subreddit}`);
      output.info(`  ${post.score} points • ${post.numComments} comments`);
      output.info('');

      if (displayComments.length === 0) {
        output.info('No comments yet.');
        return;
      }

      output.info(`Top ${displayComments.length} comments:\n`);
      for (const comment of displayComments) {
        const body = comment.body.slice(0, 200).replace(/\n/g, ' ');
        output.info(`  [${comment.score}] u/${comment.author}`);
        output.info(`    ${body}${comment.body.length > 200 ? '...' : ''}`);

        // Show nested replies if any
        if (comment.replies && comment.replies.length > 0) {
          for (const reply of comment.replies.slice(0, 2)) {
            const replyBody = reply.body.slice(0, 100).replace(/\n/g, ' ');
            output.info(`      ↳ [${reply.score}] u/${reply.author}: ${replyBody}${reply.body.length > 100 ? '...' : ''}`);
          }
        }
        output.info('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch comments');
      throw error;
    }
  },
};
