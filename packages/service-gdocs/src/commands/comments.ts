/**
 * uni gdocs comments - Manage document comments
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gdocs, extractDocumentId } from '../api';

export const commentsCommand: Command = {
  name: 'comments',
  description: 'List, add, resolve, or delete comments',
  args: [
    { name: 'action', description: 'list, add, resolve, unresolve, or delete', required: true },
    { name: 'document', description: 'Document ID or URL', required: true },
  ],
  options: [
    { name: 'content', alias: 'c', description: 'Comment content (for add)', type: 'string' },
    { name: 'quote', alias: 'q', description: 'Quoted text to comment on (for add)', type: 'string' },
    { name: 'id', description: 'Comment ID (for resolve/delete)', type: 'string' },
  ],
  examples: [
    'uni gdocs comments list DOC_ID',
    'uni gdocs comments add DOC_ID -c "Great point!"',
    'uni gdocs comments add DOC_ID -c "Needs revision" -q "some text"',
    'uni gdocs comments resolve DOC_ID --id COMMENT_ID',
    'uni gdocs comments delete DOC_ID --id COMMENT_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, options, globalFlags } = ctx;

    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const action = args.action as string;
    const documentId = extractDocumentId(args.document as string);

    if (action === 'list') {
      const spinner = output.spinner('Fetching comments...');
      try {
        const comments = await gdocs.listComments(documentId);
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
          if (comment.quotedContent) {
            output.info(`  ${c.dim(`"${comment.quotedContent}"`)}`);
          }
          output.info(`  ${c.dim(comment.id)} - ${c.dim(new Date(comment.createdTime).toLocaleString())}`);
          output.info('');
        }
      } catch (error) {
        spinner.fail('Failed to fetch comments');
        throw error;
      }
    } else if (action === 'add') {
      const content = options.content as string;
      if (!content) {
        output.error('Content is required. Use -c "your comment"');
        return;
      }

      const spinner = output.spinner('Adding comment...');
      try {
        const result = await gdocs.addComment(documentId, content, options.quote as string | undefined);
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
      const commentId = options.id as string;
      if (!commentId) {
        output.error('Comment ID is required. Use --id COMMENT_ID');
        return;
      }

      const resolve = action === 'resolve';
      const spinner = output.spinner(`${resolve ? 'Resolving' : 'Unresolving'} comment...`);
      try {
        await gdocs.resolveComment(documentId, commentId, resolve);
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
      const commentId = options.id as string;
      if (!commentId) {
        output.error('Comment ID is required. Use --id COMMENT_ID');
        return;
      }

      const spinner = output.spinner('Deleting comment...');
      try {
        await gdocs.deleteComment(documentId, commentId);
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
