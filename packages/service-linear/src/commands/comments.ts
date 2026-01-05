/**
 * uni linear comments - Manage issue comments
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { linear } from '../api';

export const commentsCommand: Command = {
  name: 'comments',
  aliases: ['comment', 'c'],
  description: 'Manage issue comments',
  subcommands: [
    {
      name: 'list',
      aliases: ['ls'],
      description: 'List comments on an issue',
      args: [{ name: 'identifier', description: 'Issue identifier (e.g., ENG-123)', required: true }],
      examples: ['uni linear comments list ENG-123'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const identifier = args.identifier as string;

        if (!linear.hasToken()) {
          output.error('LINEAR_API_KEY not set.');
          return;
        }

        const spinner = output.spinner(`Fetching comments for ${identifier}...`);

        try {
          // Get issue first to get ID
          const issue = await linear.getIssue(identifier);
          const comments = await linear.getComments(issue.id);
          spinner.success(`${comments.length} comments`);

          if (globalFlags.json) {
            output.json(comments);
            return;
          }

          if (comments.length === 0) {
            console.log(c.dim('\nNo comments found.'));
            return;
          }

          console.log('');
          for (const comment of comments) {
            const date = new Date(comment.createdAt).toLocaleDateString();
            console.log(`${c.cyan(comment.user.name)} ${c.dim(`(${date})`)}`);
            console.log(`  ${comment.body}`);
            console.log('');
          }
        } catch (error) {
          spinner.fail('Failed to fetch comments');
          throw error;
        }
      },
    },
    {
      name: 'add',
      aliases: ['create', 'new'],
      description: 'Add a comment to an issue',
      args: [
        { name: 'identifier', description: 'Issue identifier (e.g., ENG-123)', required: true },
        { name: 'body', description: 'Comment text', required: true },
      ],
      examples: [
        'uni linear comments add ENG-123 "This is fixed now"',
        'uni linear comments add ENG-123 "Needs more investigation"',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const identifier = args.identifier as string;
        const body = args.body as string;

        if (!linear.hasToken()) {
          output.error('LINEAR_API_KEY not set.');
          return;
        }

        const spinner = output.spinner(`Adding comment to ${identifier}...`);

        try {
          const issue = await linear.getIssue(identifier);
          const comment = await linear.addComment(issue.id, body);
          spinner.success('Comment added');

          if (globalFlags.json) {
            output.json(comment);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Added comment to ${c.cyan(identifier)}`);
          console.log(c.dim(`  "${body.substring(0, 50)}${body.length > 50 ? '...' : ''}"`));
          console.log('');
        } catch (error) {
          spinner.fail('Failed to add comment');
          throw error;
        }
      },
    },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    ctx.output.error('Usage: uni linear comments <list|add> <identifier>');
  },
};
