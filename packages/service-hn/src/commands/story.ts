/**
 * uni hn story - Get a story with comments
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getStoryWithComments, timeAgo, type HNComment } from '../api';

export const storyCommand: Command = {
  name: 'story',
  description: 'Get a story with comments',
  args: [
    {
      name: 'id',
      description: 'Story ID',
      required: true,
    },
  ],
  options: [
    {
      name: 'comments',
      short: 'c',
      type: 'number',
      description: 'Number of comments (default: 10)',
      default: 10,
    },
  ],
  examples: [
    'uni hn story 12345678',
    'uni hn story 12345678 -c 20',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const id = parseInt(args.id as string, 10);
    const commentLimit = (flags.comments as number) || 10;

    if (isNaN(id)) {
      output.error('Invalid story ID');
      return;
    }

    const spinner = output.spinner('Fetching story...');

    try {
      const result = await getStoryWithComments(id, commentLimit);

      if (!result) {
        spinner.fail('Story not found');
        return;
      }

      const { story, comments } = result;
      spinner.success('Story loaded');

      if (globalFlags.json) {
        output.json({ story, comments });
        return;
      }

      console.log('');
      console.log(c.bold(story.title));
      console.log(c.dim(`${story.score} points | ${story.by} | ${timeAgo(story.time)} | ${story.descendants || 0} comments`));

      if (story.url) {
        console.log('');
        console.log(c.cyan(story.url));
      }

      if ((story as unknown as { text?: string }).text) {
        console.log('');
        console.log((story as unknown as { text: string }).text);
      }

      console.log('');
      console.log(c.dim(`https://news.ycombinator.com/item?id=${story.id}`));

      if (comments.length > 0) {
        console.log('');
        console.log(c.bold('Comments:'));
        console.log('');

        for (const comment of comments) {
          printComment(comment);
        }
      }
    } catch (error) {
      spinner.fail('Failed to fetch story');
      throw error;
    }
  },
};

function printComment(comment: HNComment): void {
  // Strip HTML tags from comment text
  const text = comment.text
    .replace(/<[^>]+>/g, '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .slice(0, 400);

  console.log(c.cyan(comment.by) + c.dim(` | ${timeAgo(comment.time)}`));
  console.log(c.dim(text + (comment.text.length > 400 ? '...' : '')));
  console.log('');
}
