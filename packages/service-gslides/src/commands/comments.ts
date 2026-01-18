/**
 * uni gslides comments - Manage presentation comments
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gslides, extractPresentationId } from '../api';

export const commentsCommand: Command = {
  name: 'comments',
  description: 'List, add, resolve, or delete comments',
  args: [
    { name: 'action', description: 'list, add, resolve, unresolve, or delete', required: true },
    { name: 'presentation', description: 'Presentation ID or URL', required: true },
  ],
  options: [
    { name: 'content', short: 'c', description: 'Comment content (for add)', type: 'string' },
    { name: 'id', description: 'Comment ID (for resolve/delete)', type: 'string' },
  ],
  examples: [
    'uni gslides comments list PRES_ID',
    'uni gslides comments add PRES_ID -c "Nice slide!"',
    'uni gslides comments resolve PRES_ID --id COMMENT_ID',
    'uni gslides comments delete PRES_ID --id COMMENT_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gslides.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gslides auth" first.');
      return;
    }

    const action = args.action as string;
    const presentationId = extractPresentationId(args.presentation as string);

    if (action === 'list') {
      const spinner = output.spinner('Fetching comments...');
      try {
        const comments = await gslides.listComments(presentationId);
        spinner.stop();

        if (globalFlags.json) {
          output.json(comments);
          return;
        }

        if (comments.length === 0) {
          output.info('No comments found.');
          return;
        }

        output.info('');
        for (const comment of comments) {
          const status = comment.resolved ? c.green('[Resolved]') : c.yellow('[Open]');
          output.info(`${status} ${c.bold(comment.author.displayName)}`);
          output.info(`  ${comment.content}`);
          output.info(`  ${c.dim(comment.id)} - ${c.dim(new Date(comment.createdTime).toLocaleString())}`);
          output.info('');
        }
      } catch (error) {
        spinner.fail('Failed to fetch comments');
        throw error;
      }
    } else if (action === 'add') {
      const content = flags.content as string;
      if (!content) {
        output.error('Content is required. Use -c "your comment"');
        return;
      }

      const spinner = output.spinner('Adding comment...');
      try {
        const result = await gslides.addComment(presentationId, content);
        spinner.stop();

        if (globalFlags.json) {
          output.json(result);
          return;
        }

        output.success(`Comment added (ID: ${result.id})`);
      } catch (error) {
        spinner.fail('Failed to add comment');
        throw error;
      }
    } else if (action === 'resolve' || action === 'unresolve') {
      const commentId = flags.id as string;
      if (!commentId) {
        output.error('Comment ID is required. Use --id COMMENT_ID');
        return;
      }

      const resolve = action === 'resolve';
      const spinner = output.spinner(`${resolve ? 'Resolving' : 'Unresolving'} comment...`);
      try {
        await gslides.resolveComment(presentationId, commentId, resolve);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ success: true, commentId, resolved: resolve });
          return;
        }

        output.success(`Comment ${resolve ? 'resolved' : 'unresolved'}`);
      } catch (error) {
        spinner.fail(`Failed to ${action} comment`);
        throw error;
      }
    } else if (action === 'delete') {
      const commentId = flags.id as string;
      if (!commentId) {
        output.error('Comment ID is required. Use --id COMMENT_ID');
        return;
      }

      const spinner = output.spinner('Deleting comment...');
      try {
        await gslides.deleteComment(presentationId, commentId);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ success: true, commentId });
          return;
        }

        output.success('Comment deleted');
      } catch (error) {
        spinner.fail('Failed to delete comment');
        throw error;
      }
    } else {
      output.error('Action must be: list, add, resolve, unresolve, or delete');
    }
  },
};
