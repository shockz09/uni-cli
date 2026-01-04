/**
 * uni reddit post - Get a post with comments
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getPostById, type RedditComment } from '../api';

export const postCommand: Command = {
  name: 'post',
  description: 'Get a post with comments',
  args: [
    {
      name: 'id',
      description: 'Post ID (from URL)',
      required: true,
    },
  ],
  examples: [
    'uni reddit post 1abc2de',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    const id = args.id as string;

    const spinner = output.spinner('Fetching post...');

    try {
      const result = await getPostById(id);

      if (!result) {
        spinner.fail('Post not found');
        output.error(`Could not find post: ${id}`);
        return;
      }

      const { post, comments } = result;
      spinner.success('Post loaded');

      if (globalFlags.json) {
        output.json({ post, comments });
        return;
      }

      console.log('');
      console.log(c.bold(post.title));
      console.log(c.dim(`r/${post.subreddit} | u/${post.author} | ${post.score} points | ${post.numComments} comments`));

      if (post.selftext) {
        console.log('');
        console.log(post.selftext.slice(0, 500) + (post.selftext.length > 500 ? '...' : ''));
      }

      if (post.url && !post.url.includes('reddit.com')) {
        console.log('');
        console.log(c.cyan(`Link: ${post.url}`));
      }

      console.log('');
      console.log(c.dim(post.permalink));

      if (comments.length > 0) {
        console.log('');
        console.log(c.bold('Top Comments:'));
        console.log('');

        for (const comment of comments.slice(0, 5)) {
          printComment(comment, 0);
        }
      }
    } catch (error) {
      spinner.fail('Failed to fetch post');
      throw error;
    }
  },
};

function printComment(comment: RedditComment, depth: number): void {
  const indent = '  '.repeat(depth);
  const score = c.cyan(`${comment.score}`);
  const body = comment.body.slice(0, 300) + (comment.body.length > 300 ? '...' : '');

  console.log(`${indent}${score} u/${comment.author}`);
  console.log(`${indent}${c.dim(body.replace(/\n/g, `\n${indent}`))}`);
  console.log('');

  // Print nested replies (limited)
  if (comment.replies && depth < 1) {
    for (const reply of comment.replies.slice(0, 2)) {
      printComment(reply, depth + 1);
    }
  }
}
