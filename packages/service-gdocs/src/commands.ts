/**
 * Google Docs Commands - Declarative + Manual Handlers
 *
 * Simple commands use cmds() declarative syntax.
 * Complex commands with custom logic are defined manually.
 */

import type { Command, CommandContext } from '@uni/shared';
import { cmds, c } from '@uni/shared';
import { gdocs, extractDocumentId } from './api';
import { createGoogleAuthCommand } from '@uni/shared';
import { readFileSync, existsSync } from 'fs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolve } from 'path';

// ============================================================
// Auth Command (special handling via shared helper)
// ============================================================

export const authCommand = createGoogleAuthCommand({
  serviceName: 'Docs',
  serviceKey: 'gdocs',
  client: gdocs,
});

// ============================================================
// Declarative Commands (simple API calls)
// ============================================================

const declarativeCommands = cmds(gdocs, 'gdocs', {
  // Document operations
  stats: {
    method: 'getStats',
    desc: 'Get document statistics (words, characters, pages)',
    args: ['document:docId'],
    output: (stats: { words: number; characters: number; paragraphs: number; pages: number }, ctx) => {
      ctx.output.info('');
      ctx.output.info(c.bold('Document Statistics'));
      ctx.output.info(`  Words:      ${c.cyan(stats.words.toLocaleString())}`);
      ctx.output.info(`  Characters: ${c.cyan(stats.characters.toLocaleString())}`);
      ctx.output.info(`  Paragraphs: ${c.cyan(stats.paragraphs.toLocaleString())}`);
      ctx.output.info(`  Pages:      ${c.cyan(stats.pages.toLocaleString())} (estimated)`);
      ctx.output.info('');
    },
  },

  copy: {
    method: 'copyDocument',
    desc: 'Duplicate a document',
    args: ['document:docId'],
    opts: { name: { short: 'n', desc: 'Name for the copy' } },
    output: (newId: string, ctx) => {
      ctx.output.success('Document copied');
      ctx.output.info(`  ID: ${c.cyan(newId)}`);
      ctx.output.info(`  URL: ${c.dim(`https://docs.google.com/document/d/${newId}/edit`)}`);
    },
  },

  move: {
    method: 'moveDocument',
    desc: 'Move document to a different folder',
    args: ['document:docId', 'folder:folderId'],
    output: (_: void, ctx) => {
      ctx.output.success('Document moved to folder');
    },
  },

  versions: {
    method: 'getRevisions',
    desc: 'View document revision history',
    args: ['document:docId'],
    opts: { limit: { short: 'l', type: 'number', desc: 'Max revisions to show', default: 10 } },
    output: (revisions: Array<{ id: string; modifiedTime: string; lastModifyingUser?: { displayName: string } }>, ctx) => {
      if (revisions.length === 0) {
        ctx.output.info('No revision history available.');
        return;
      }
      ctx.output.info('');
      ctx.output.info(c.bold('Revision History'));
      ctx.output.info('');
      for (const rev of revisions) {
        const date = new Date(rev.modifiedTime).toLocaleString();
        const user = rev.lastModifyingUser?.displayName || 'Unknown';
        ctx.output.info(`  ${c.dim(rev.id)} - ${c.cyan(date)}`);
        ctx.output.info(`    Modified by: ${user}`);
      }
      ctx.output.info('');
    },
  },
});

// ============================================================
// Manual Commands (complex logic)
// ============================================================

const listCommand: Command = {
  name: 'list',
  description: 'List recent documents',
  aliases: ['ls'],
  options: [
    { name: 'limit', short: 'l', type: 'number', description: 'Max documents to show', default: 10 },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching documents...');
    try {
      const limit = (flags.limit as number) || 10;
      const files = await gdocs.listDocuments(limit);
      spinner.success(`Found ${files.length} document(s)`);

      if (globalFlags.json) {
        output.json(files);
        return;
      }

      if (files.length === 0) {
        console.log(c.dim('No documents found'));
        return;
      }

      console.log('');
      console.log(c.bold('Recent Documents:'));
      console.log('');
      for (const file of files) {
        const modified = new Date(file.modifiedTime).toLocaleDateString();
        console.log(`  ${c.bold(file.name)}`);
        console.log(`  ${c.dim(`ID: ${file.id} | Modified: ${modified}`)}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch documents');
      throw error;
    }
  },
};

const createCommand: Command = {
  name: 'create',
  description: 'Create a new document',
  args: [{ name: 'title', description: 'Document title', required: true }],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const title = args.title as string;
    const spinner = output.spinner(`Creating document "${title}"...`);

    try {
      const doc = await gdocs.createDocument(title);
      spinner.success('Document created');

      if (globalFlags.json) {
        output.json({
          id: doc.documentId,
          title: doc.title,
          url: `https://docs.google.com/document/d/${doc.documentId}/edit`,
        });
        return;
      }

      console.log('');
      console.log(`${c.green('Created:')} https://docs.google.com/document/d/${doc.documentId}/edit`);
      console.log(`${c.bold('Document:')} ${doc.title}`);
      console.log(c.dim(`ID: ${doc.documentId}`));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to create document');
      throw error;
    }
  },
};

const getCommand: Command = {
  name: 'get',
  description: 'Get document content',
  args: [{ name: 'id', description: 'Document ID or URL', required: true }],
  options: [{ name: 'markdown', short: 'm', type: 'boolean', description: 'Output as markdown' }],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const asMarkdown = flags.markdown as boolean;
    const spinner = output.spinner('Fetching document...');

    try {
      const doc = await gdocs.getDocument(documentId);
      const content = gdocs.extractText(doc);
      spinner.success('Document fetched');

      if (globalFlags.json) {
        output.json({ id: doc.documentId, title: doc.title, content });
        return;
      }

      console.log('');
      console.log(c.bold(doc.title));
      console.log(c.dim(`ID: ${doc.documentId}`));
      console.log('');

      if (asMarkdown) {
        const lines = content.split('\n');
        if (lines.length > 0) {
          console.log(`# ${lines[0]}`);
          console.log('');
          console.log(lines.slice(1).join('\n'));
        }
      } else {
        console.log(content);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch document');
      throw error;
    }
  },
};

const appendCommand: Command = {
  name: 'append',
  description: 'Append text to document',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'text', description: 'Text to append', required: true },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const text = (args.text as string).replace(/\\n/g, '\n');
    const spinner = output.spinner('Appending text...');

    try {
      await gdocs.appendText(documentId, text);
      spinner.success('Text appended');

      if (globalFlags.json) {
        output.json({ documentId, appended: text, success: true });
        return;
      }

      console.log('');
      console.log(c.green('Appended to document'));
      console.log('');
    } catch (error) {
      spinner.fail('Failed to append text');
      throw error;
    }
  },
};

const replaceCommand: Command = {
  name: 'replace',
  description: 'Replace text in document',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'old', description: 'Text to find', required: true },
    { name: 'new', description: 'Replacement text', required: true },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const oldText = args.old as string;
    const newText = args.new as string;
    const spinner = output.spinner('Replacing text...');

    try {
      const count = await gdocs.replaceText(documentId, oldText, newText);
      spinner.success(`Replaced ${count} occurrence(s)`);

      if (globalFlags.json) {
        output.json({ documentId, oldText, newText, replacements: count });
        return;
      }

      console.log('');
      console.log(c.green(`Replaced ${count} occurrence(s)`));
      console.log(`  "${oldText}" → "${newText}"`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to replace text');
      throw error;
    }
  },
};

const renameCommand: Command = {
  name: 'rename',
  description: 'Rename a document',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'title', description: 'New title', required: true },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const newTitle = args.title as string;
    const spinner = output.spinner('Renaming document...');

    try {
      await gdocs.renameDocument(documentId, newTitle);
      spinner.success(`Renamed to "${newTitle}"`);

      if (globalFlags.json) {
        output.json({ documentId, title: newTitle, renamed: true });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Document:')} ${newTitle}`);
        console.log(c.dim(`https://docs.google.com/document/d/${documentId}/edit`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to rename document');
      throw error;
    }
  },
};

const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a document (moves to trash)',
  args: [{ name: 'id', description: 'Document ID or URL', required: true }],
  options: [{ name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation' }],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const doc = await gdocs.getDocument(documentId);
    const title = doc.title;

    if (!flags.force && !output.isPiped()) {
      console.log(`${c.yellow('Warning:')} About to delete "${title}"`);
      console.log(c.dim('Use --force to skip this warning'));
    }

    const spinner = output.spinner('Deleting document...');

    try {
      await gdocs.deleteDocument(documentId);
      spinner.success(`Deleted "${title}"`);

      if (globalFlags.json) {
        output.json({ documentId, title, deleted: true });
      }
    } catch (error) {
      spinner.fail('Failed to delete document');
      throw error;
    }
  },
};

const clearCommand: Command = {
  name: 'clear',
  description: 'Clear all content from document',
  args: [{ name: 'id', description: 'Document ID or URL', required: true }],
  options: [{ name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation' }],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const doc = await gdocs.getDocument(documentId);
    const title = doc.title;

    if (!flags.force && !output.isPiped()) {
      console.log(`${c.yellow('Warning:')} About to clear all content from "${title}"`);
      console.log(c.dim('Use --force to skip this warning'));
    }

    const spinner = output.spinner('Clearing document...');

    try {
      await gdocs.clearContent(documentId);
      spinner.success(`Cleared "${title}"`);

      if (globalFlags.json) {
        output.json({ documentId, title, cleared: true });
      }
    } catch (error) {
      spinner.fail('Failed to clear document');
      throw error;
    }
  },
};

const shareCommand: Command = {
  name: 'share',
  description: 'Share document with email',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'email', description: 'Email address to share with', required: true },
  ],
  options: [
    { name: 'role', short: 'r', type: 'string', description: 'Permission role: reader or writer', default: 'writer' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const email = args.email as string;
    const role = (flags.role as string) === 'reader' ? 'reader' : 'writer';
    const spinner = output.spinner(`Sharing with ${email}...`);

    try {
      await gdocs.shareDocument(documentId, email, role);
      spinner.success('Document shared');

      if (globalFlags.json) {
        output.json({ documentId, sharedWith: email, role, success: true });
        return;
      }

      console.log('');
      console.log(`${c.green(`Shared with ${email}`)} (${role} access)`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to share document');
      throw error;
    }
  },
};

const insertCommand: Command = {
  name: 'insert',
  description: 'Insert text at position or insert image from URL',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'content', description: 'Text to insert or image URL', required: true },
  ],
  options: [
    { name: 'at', short: 'a', type: 'string', description: 'Position: "start", "end", or index number' },
    { name: 'image', short: 'i', type: 'boolean', description: 'Insert as image (content should be URL)' },
    { name: 'width', short: 'w', type: 'number', description: 'Image width in points (default: 400)' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const content = args.content as string;
    const position = flags.at as string | undefined;
    const isImage = flags.image as boolean || false;
    const imageWidth = (flags.width as number) || 400;

    const spinner = output.spinner(isImage ? 'Inserting image...' : 'Inserting text...');

    try {
      if (isImage) {
        await gdocs.insertImage(documentId, content, imageWidth, position);
        spinner.success('Image inserted');
      } else {
        await gdocs.insertText(documentId, content, position);
        spinner.success('Text inserted');
      }

      if (globalFlags.json) {
        output.json({
          documentId,
          type: isImage ? 'image' : 'text',
          position: position || 'end',
          content: isImage ? content : content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Inserted:')} ${isImage ? 'Image' : 'Text'} at ${position || 'end'}`);
        console.log(c.dim(`https://docs.google.com/document/d/${documentId}/edit`));
        console.log('');
      }
    } catch (error) {
      spinner.fail(isImage ? 'Failed to insert image' : 'Failed to insert text');
      throw error;
    }
  },
};

const findCommand: Command = {
  name: 'find',
  description: 'Find text in document, optionally replace',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'text', description: 'Text to find', required: true },
  ],
  options: [
    { name: 'replace', short: 'r', type: 'string', description: 'Replace with this text' },
    { name: 'case', short: 'c', type: 'boolean', description: 'Case-sensitive search' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const searchText = args.text as string;
    const replaceText = flags.replace as string | undefined;
    const caseSensitive = flags.case as boolean || false;

    const spinner = output.spinner(replaceText ? 'Finding and replacing...' : 'Finding text...');

    try {
      if (replaceText !== undefined) {
        const count = await gdocs.replaceText(documentId, searchText, replaceText, caseSensitive);
        spinner.success(`Replaced ${count} occurrence(s)`);

        if (globalFlags.json) {
          output.json({ documentId, searchText, replaceText, occurrences: count });
          return;
        }

        if (!output.isPiped()) {
          console.log('');
          console.log(`${c.green('Replaced:')} "${searchText}" → "${replaceText}"`);
          console.log(`${c.green('Count:')} ${count} occurrence(s)`);
          console.log('');
        }
      } else {
        const doc = await gdocs.getDocument(documentId);
        const content = gdocs.extractText(doc);
        const regex = new RegExp(
          searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          caseSensitive ? 'g' : 'gi'
        );

        const matches: { index: number; context: string }[] = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
          const start = Math.max(0, match.index - 30);
          const end = Math.min(content.length, match.index + searchText.length + 30);
          const context = content.slice(start, end).replace(/\n/g, ' ');
          matches.push({ index: match.index, context });
        }

        spinner.success(`Found ${matches.length} occurrence(s)`);

        if (globalFlags.json) {
          output.json({ documentId, searchText, caseSensitive, occurrences: matches.length, matches: matches.slice(0, 20) });
          return;
        }

        if (!output.isPiped()) {
          console.log('');
          console.log(`${c.green('Found:')} ${matches.length} occurrence(s) of "${searchText}"`);

          if (matches.length > 0) {
            console.log('');
            const showCount = Math.min(matches.length, 10);
            for (let i = 0; i < showCount; i++) {
              const m = matches[i];
              const highlighted = m.context.replace(
                new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi'),
                c.yellow(searchText)
              );
              console.log(`  ${c.dim(`${i + 1}.`)} ...${highlighted}...`);
            }
            if (matches.length > 10) {
              console.log(c.dim(`  ... and ${matches.length - 10} more`));
            }
          }
          console.log('');
        }
      }
    } catch (error) {
      spinner.fail('Failed to search document');
      throw error;
    }
  },
};

const commentsCommand: Command = {
  name: 'comments',
  description: 'List, add, resolve, or delete comments',
  args: [
    { name: 'action', description: 'list, add, resolve, unresolve, or delete', required: true },
    { name: 'document', description: 'Document ID or URL', required: true },
  ],
  options: [
    { name: 'content', short: 'c', description: 'Comment content (for add)', type: 'string' },
    { name: 'quote', short: 'q', description: 'Quoted text to comment on (for add)', type: 'string' },
    { name: 'id', description: 'Comment ID (for resolve/delete)', type: 'string' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
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
      const content = flags.content as string;
      if (!content) {
        output.error('Content is required. Use -c "your comment"');
        return;
      }

      const spinner = output.spinner('Adding comment...');
      try {
        const result = await gdocs.addComment(documentId, content, flags.quote as string | undefined);
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
      const commentId = flags.id as string;
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

const EXPORT_FORMATS: Record<string, { mimeType: string; extension: string }> = {
  pdf: { mimeType: 'application/pdf', extension: '.pdf' },
  docx: { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx' },
  txt: { mimeType: 'text/plain', extension: '.txt' },
  html: { mimeType: 'text/html', extension: '.html' },
  md: { mimeType: 'text/plain', extension: '.md' },
};

const exportCommand: Command = {
  name: 'export',
  description: 'Export document to file',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'format', description: 'Export format: pdf, docx, txt, html, md', required: true },
  ],
  options: [{ name: 'output', short: 'o', type: 'string', description: 'Output file path' }],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const format = (args.format as string).toLowerCase();
    const outputPath = flags.output as string | undefined;

    const formatInfo = EXPORT_FORMATS[format];
    if (!formatInfo) {
      output.error(`Unknown format: ${format}. Use: pdf, docx, txt, html, md`);
      return;
    }

    const spinner = output.spinner(`Exporting as ${format.toUpperCase()}...`);

    try {
      const doc = await gdocs.getDocument(documentId);
      const defaultFilename = `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}${formatInfo.extension}`;
      const finalPath = outputPath || defaultFilename;

      if (format === 'md') {
        const content = gdocs.extractText(doc);
        const markdown = `# ${doc.title}\n\n${content}`;
        fs.writeFileSync(finalPath, markdown);
      } else {
        const data = await gdocs.exportDocument(documentId, formatInfo.mimeType);
        fs.writeFileSync(finalPath, Buffer.from(data));
      }

      spinner.success('Document exported');

      if (globalFlags.json) {
        output.json({ documentId, format, file: path.resolve(finalPath), success: true });
        return;
      }

      console.log('');
      console.log(`${c.green('Exported:')} ${finalPath}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to export document');
      throw error;
    }
  },
};

const importCommand: Command = {
  name: 'import',
  description: 'Import content from text file into document',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'file', description: 'File path to import (.txt, .md)', required: true },
  ],
  options: [
    { name: 'append', short: 'a', type: 'boolean', description: 'Append to existing content' },
    { name: 'at', type: 'string', description: 'Insert position: "start", "end", or index' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const filePath = resolve(args.file as string);
    const appendMode = flags.append as boolean || false;
    const position = flags.at as string | undefined;

    if (!existsSync(filePath)) {
      output.error(`File not found: ${filePath}`);
      return;
    }

    const spinner = output.spinner('Importing file...');

    try {
      const content = readFileSync(filePath, 'utf-8');

      if (appendMode || position) {
        await gdocs.insertText(documentId, content, position || 'end');
      } else {
        const doc = await gdocs.getDocument(documentId);
        const endIndex = doc.body?.content?.slice(-1)[0]?.endIndex || 1;
        if (endIndex > 2) {
          await gdocs.clearContent(documentId);
        }
        await gdocs.insertText(documentId, content, 'start');
      }

      spinner.success(`Imported ${content.length} characters`);

      if (globalFlags.json) {
        output.json({ documentId, file: filePath, characters: content.length, mode: appendMode ? 'append' : 'replace' });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Imported:')} ${filePath}`);
        console.log(`${c.green('Characters:')} ${content.length}`);
        console.log(`${c.green('Mode:')} ${appendMode ? 'append' : 'replace'}`);
        console.log(c.dim(`https://docs.google.com/document/d/${documentId}/edit`));
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to import file');
      throw error;
    }
  },
};

const formatCommand: Command = {
  name: 'format',
  description: 'Apply text formatting (bold, italic, underline, etc.)',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'start', description: 'Start index', required: true },
    { name: 'end', description: 'End index', required: true },
  ],
  options: [
    { name: 'bold', short: 'b', type: 'boolean', description: 'Make text bold' },
    { name: 'italic', short: 'i', type: 'boolean', description: 'Make text italic' },
    { name: 'underline', short: 'u', type: 'boolean', description: 'Underline text' },
    { name: 'strike', type: 'boolean', description: 'Strikethrough text' },
    { name: 'size', short: 's', type: 'string', description: 'Font size in points' },
    { name: 'color', short: 'c', type: 'string', description: 'Text color (hex or name)' },
    { name: 'bg', type: 'string', description: 'Background color (hex or name)' },
    { name: 'font', short: 'f', type: 'string', description: 'Font family' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const startIndex = parseInt(args.start as string, 10);
    const endIndex = parseInt(args.end as string, 10);

    if (isNaN(startIndex) || isNaN(endIndex)) {
      output.error('Start and end must be numbers');
      return;
    }

    const style: Record<string, unknown> = {};
    if (flags.bold) style.bold = true;
    if (flags.italic) style.italic = true;
    if (flags.underline) style.underline = true;
    if (flags.strike) style.strikethrough = true;
    if (flags.size) style.fontSize = parseFloat(flags.size as string);
    if (flags.font) style.fontFamily = flags.font as string;
    if (flags.color) style.foregroundColor = parseColor(flags.color as string);
    if (flags.bg) style.backgroundColor = parseColor(flags.bg as string);

    if (Object.keys(style).length === 0) {
      output.error('Specify at least one formatting option (--bold, --italic, etc.)');
      return;
    }

    const spinner = output.spinner('Applying formatting...');

    try {
      await gdocs.updateTextStyle(documentId, startIndex, endIndex, style as Parameters<typeof gdocs.updateTextStyle>[3]);
      spinner.success(`Applied formatting to characters ${startIndex}-${endIndex}`);

      if (globalFlags.json) {
        output.json({ startIndex, endIndex, style });
      }
    } catch (error) {
      spinner.fail('Failed to apply formatting');
      throw error;
    }
  },
};

function parseColor(color: string): { red: number; green: number; blue: number } {
  const colors: Record<string, { red: number; green: number; blue: number }> = {
    black: { red: 0, green: 0, blue: 0 },
    white: { red: 1, green: 1, blue: 1 },
    red: { red: 1, green: 0, blue: 0 },
    green: { red: 0, green: 1, blue: 0 },
    blue: { red: 0, green: 0, blue: 1 },
    yellow: { red: 1, green: 1, blue: 0 },
    cyan: { red: 0, green: 1, blue: 1 },
    magenta: { red: 1, green: 0, blue: 1 },
    gray: { red: 0.5, green: 0.5, blue: 0.5 },
    orange: { red: 1, green: 0.65, blue: 0 },
    purple: { red: 0.5, green: 0, blue: 0.5 },
  };

  const lower = color.toLowerCase();
  if (colors[lower]) return colors[lower];

  const hex = color.replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return {
      red: parseInt(hex.slice(0, 2), 16) / 255,
      green: parseInt(hex.slice(2, 4), 16) / 255,
      blue: parseInt(hex.slice(4, 6), 16) / 255,
    };
  }

  return { red: 0, green: 0, blue: 0 };
}

const styleCommand: Command = {
  name: 'style',
  description: 'Apply paragraph style (heading, alignment, spacing)',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'start', description: 'Start index', required: true },
    { name: 'end', description: 'End index', required: true },
  ],
  options: [
    { name: 'heading', short: 'h', type: 'string', description: 'Heading level: title, subtitle, 1-6, normal' },
    { name: 'align', short: 'a', type: 'string', description: 'Alignment: left, center, right, justified' },
    { name: 'line-spacing', type: 'string', description: 'Line spacing (e.g., 100 for single, 200 for double)' },
    { name: 'space-above', type: 'string', description: 'Space above paragraph (points)' },
    { name: 'space-below', type: 'string', description: 'Space below paragraph (points)' },
    { name: 'indent', type: 'string', description: 'First line indent (points)' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const startIndex = parseInt(args.start as string, 10);
    const endIndex = parseInt(args.end as string, 10);

    if (isNaN(startIndex) || isNaN(endIndex)) {
      output.error('Start and end must be numbers');
      return;
    }

    const style: Record<string, unknown> = {};

    if (flags.heading) {
      const headingMap: Record<string, string> = {
        title: 'TITLE', subtitle: 'SUBTITLE', normal: 'NORMAL_TEXT',
        '1': 'HEADING_1', '2': 'HEADING_2', '3': 'HEADING_3',
        '4': 'HEADING_4', '5': 'HEADING_5', '6': 'HEADING_6',
      };
      const heading = headingMap[(flags.heading as string).toLowerCase()];
      if (!heading) {
        output.error('Invalid heading. Use: title, subtitle, normal, or 1-6');
        return;
      }
      style.namedStyleType = heading;
    }

    if (flags.align) {
      const alignMap: Record<string, string> = { left: 'START', center: 'CENTER', right: 'END', justified: 'JUSTIFIED' };
      const align = alignMap[(flags.align as string).toLowerCase()];
      if (!align) {
        output.error('Invalid alignment. Use: left, center, right, justified');
        return;
      }
      style.alignment = align;
    }

    if (flags['line-spacing']) style.lineSpacing = parseFloat(flags['line-spacing'] as string);
    if (flags['space-above']) style.spaceAbove = parseFloat(flags['space-above'] as string);
    if (flags['space-below']) style.spaceBelow = parseFloat(flags['space-below'] as string);
    if (flags.indent) style.indentFirstLine = parseFloat(flags.indent as string);

    if (Object.keys(style).length === 0) {
      output.error('Specify at least one style option (--heading, --align, etc.)');
      return;
    }

    const spinner = output.spinner('Applying paragraph style...');

    try {
      await gdocs.updateParagraphStyle(documentId, startIndex, endIndex, style as Parameters<typeof gdocs.updateParagraphStyle>[3]);
      spinner.success(`Applied paragraph style to characters ${startIndex}-${endIndex}`);

      if (globalFlags.json) {
        output.json({ startIndex, endIndex, style });
      }
    } catch (error) {
      spinner.fail('Failed to apply paragraph style');
      throw error;
    }
  },
};

const bulletsCommand: Command = {
  name: 'bullets',
  description: 'Create or remove bulleted/numbered lists',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'start', description: 'Start index', required: true },
    { name: 'end', description: 'End index', required: true },
  ],
  options: [
    { name: 'type', short: 't', type: 'string', description: 'List type: bullet, numbered, checkbox, or remove' },
    { name: 'style', short: 's', type: 'string', description: 'Bullet style: disc, diamond, arrow, star (for bullets) or decimal, alpha, roman (for numbered)' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const startIndex = parseInt(args.start as string, 10);
    const endIndex = parseInt(args.end as string, 10);
    const listType = (flags.type as string)?.toLowerCase() || 'bullet';
    const style = (flags.style as string)?.toLowerCase();

    if (isNaN(startIndex) || isNaN(endIndex)) {
      output.error('Start and end must be numbers');
      return;
    }

    const spinner = output.spinner('Updating list formatting...');

    try {
      if (listType === 'remove') {
        await gdocs.deleteParagraphBullets(documentId, startIndex, endIndex);
        spinner.success('Removed bullets/numbering');
      } else {
        let preset: Parameters<typeof gdocs.createParagraphBullets>[3];

        if (listType === 'bullet') {
          const bulletStyles: Record<string, Parameters<typeof gdocs.createParagraphBullets>[3]> = {
            disc: 'BULLET_DISC_CIRCLE_SQUARE',
            diamond: 'BULLET_DIAMONDX_ARROW3D_SQUARE',
            arrow: 'BULLET_ARROW_DIAMOND_DISC',
            star: 'BULLET_STAR_CIRCLE_SQUARE',
          };
          preset = bulletStyles[style || 'disc'] || 'BULLET_DISC_CIRCLE_SQUARE';
        } else if (listType === 'numbered') {
          const numberedStyles: Record<string, Parameters<typeof gdocs.createParagraphBullets>[3]> = {
            decimal: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
            alpha: 'NUMBERED_UPPERALPHA_ALPHA_ROMAN',
            roman: 'NUMBERED_UPPERROMAN_UPPERALPHA_DECIMAL',
          };
          preset = numberedStyles[style || 'decimal'] || 'NUMBERED_DECIMAL_ALPHA_ROMAN';
        } else if (listType === 'checkbox') {
          preset = 'BULLET_CHECKBOX';
        } else {
          spinner.fail('Invalid list type. Use: bullet, numbered, checkbox, or remove');
          return;
        }

        await gdocs.createParagraphBullets(documentId, startIndex, endIndex, preset);
        spinner.success(`Created ${listType} list`);
      }

      if (globalFlags.json) {
        output.json({ startIndex, endIndex, type: listType, style });
      }
    } catch (error) {
      spinner.fail('Failed to update list formatting');
      throw error;
    }
  },
};

const tableCommand: Command = {
  name: 'table',
  description: 'Insert a table or manage table rows/columns',
  args: [{ name: 'id', description: 'Document ID or URL', required: true }],
  options: [
    { name: 'insert', type: 'boolean', description: 'Insert a new table' },
    { name: 'rows', short: 'r', type: 'string', description: 'Number of rows (for insert)' },
    { name: 'cols', short: 'c', type: 'string', description: 'Number of columns (for insert)' },
    { name: 'at', type: 'string', description: 'Insert position (index)' },
    { name: 'add-row', type: 'string', description: 'Add row at table (tableStartIndex:rowIndex)' },
    { name: 'add-col', type: 'string', description: 'Add column at table (tableStartIndex:colIndex)' },
    { name: 'del-row', type: 'string', description: 'Delete row from table (tableStartIndex:rowIndex)' },
    { name: 'del-col', type: 'string', description: 'Delete column from table (tableStartIndex:colIndex)' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const spinner = output.spinner('Managing table...');

    try {
      if (flags.insert) {
        const rows = parseInt(flags.rows as string, 10) || 3;
        const cols = parseInt(flags.cols as string, 10) || 3;
        const at = flags.at ? parseInt(flags.at as string, 10) : undefined;

        await gdocs.insertTable(documentId, rows, cols, at);
        spinner.success(`Inserted ${rows}x${cols} table`);

        if (globalFlags.json) output.json({ action: 'insert', rows, cols, at });
      } else if (flags['add-row']) {
        const [tableStart, rowIdx] = (flags['add-row'] as string).split(':').map(Number);
        if (isNaN(tableStart) || isNaN(rowIdx)) {
          spinner.fail('Invalid format. Use: tableStartIndex:rowIndex');
          return;
        }
        await gdocs.insertTableRow(documentId, tableStart, rowIdx);
        spinner.success(`Added row after row ${rowIdx}`);
        if (globalFlags.json) output.json({ action: 'add-row', tableStart, rowIndex: rowIdx });
      } else if (flags['add-col']) {
        const [tableStart, colIdx] = (flags['add-col'] as string).split(':').map(Number);
        if (isNaN(tableStart) || isNaN(colIdx)) {
          spinner.fail('Invalid format. Use: tableStartIndex:colIndex');
          return;
        }
        await gdocs.insertTableColumn(documentId, tableStart, colIdx);
        spinner.success(`Added column after column ${colIdx}`);
        if (globalFlags.json) output.json({ action: 'add-col', tableStart, columnIndex: colIdx });
      } else if (flags['del-row']) {
        const [tableStart, rowIdx] = (flags['del-row'] as string).split(':').map(Number);
        if (isNaN(tableStart) || isNaN(rowIdx)) {
          spinner.fail('Invalid format. Use: tableStartIndex:rowIndex');
          return;
        }
        await gdocs.deleteTableRow(documentId, tableStart, rowIdx);
        spinner.success(`Deleted row ${rowIdx}`);
        if (globalFlags.json) output.json({ action: 'del-row', tableStart, rowIndex: rowIdx });
      } else if (flags['del-col']) {
        const [tableStart, colIdx] = (flags['del-col'] as string).split(':').map(Number);
        if (isNaN(tableStart) || isNaN(colIdx)) {
          spinner.fail('Invalid format. Use: tableStartIndex:colIndex');
          return;
        }
        await gdocs.deleteTableColumn(documentId, tableStart, colIdx);
        spinner.success(`Deleted column ${colIdx}`);
        if (globalFlags.json) output.json({ action: 'del-col', tableStart, columnIndex: colIdx });
      } else {
        spinner.fail('Specify an action: --insert, --add-row, --add-col, --del-row, or --del-col');
      }
    } catch (error) {
      spinner.fail('Failed to manage table');
      throw error;
    }
  },
};

const linkCommand: Command = {
  name: 'link',
  description: 'Insert or remove hyperlinks from text',
  args: [
    { name: 'id', description: 'Document ID or URL', required: true },
    { name: 'start', description: 'Start index', required: true },
    { name: 'end', description: 'End index', required: true },
  ],
  options: [
    { name: 'url', short: 'u', type: 'string', description: 'URL to link to' },
    { name: 'remove', short: 'r', type: 'boolean', description: 'Remove existing link' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const startIndex = parseInt(args.start as string, 10);
    const endIndex = parseInt(args.end as string, 10);
    const url = flags.url as string | undefined;
    const remove = flags.remove as boolean;

    if (isNaN(startIndex) || isNaN(endIndex)) {
      output.error('Start and end must be numbers');
      return;
    }

    if (!url && !remove) {
      output.error('Specify --url to add a link or --remove to remove one');
      return;
    }

    const spinner = output.spinner(remove ? 'Removing link...' : 'Adding link...');

    try {
      if (remove) {
        await gdocs.removeLink(documentId, startIndex, endIndex);
        spinner.success(`Removed link from characters ${startIndex}-${endIndex}`);
      } else {
        await gdocs.insertLink(documentId, startIndex, endIndex, url!);
        spinner.success(`Added link to characters ${startIndex}-${endIndex}`);
      }

      if (globalFlags.json) {
        output.json({ startIndex, endIndex, url: remove ? null : url, removed: remove });
      }
    } catch (error) {
      spinner.fail(remove ? 'Failed to remove link' : 'Failed to add link');
      throw error;
    }
  },
};

const pageBreakCommand: Command = {
  name: 'page-break',
  description: 'Insert a page break',
  args: [{ name: 'id', description: 'Document ID or URL', required: true }],
  options: [{ name: 'at', type: 'string', description: 'Insert position (index). Default: end of document' }],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const at = flags.at ? parseInt(flags.at as string, 10) : undefined;

    if (flags.at && isNaN(at!)) {
      output.error('Position must be a number');
      return;
    }

    const spinner = output.spinner('Inserting page break...');

    try {
      await gdocs.insertPageBreak(documentId, at);
      spinner.success(at ? `Inserted page break at position ${at}` : 'Inserted page break at end');

      if (globalFlags.json) {
        output.json({ at: at || 'end' });
      }
    } catch (error) {
      spinner.fail('Failed to insert page break');
      throw error;
    }
  },
};

const headerCommand: Command = {
  name: 'header',
  description: 'Add, update, or remove document header',
  args: [{ name: 'id', description: 'Document ID or URL', required: true }],
  options: [
    { name: 'text', short: 't', type: 'string', description: 'Header text to add' },
    { name: 'remove', short: 'r', type: 'string', description: 'Header ID to remove' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const text = flags.text as string | undefined;
    const removeId = flags.remove as string | undefined;

    if (!text && !removeId) {
      output.error('Specify --text to add a header or --remove <headerId> to remove one');
      return;
    }

    const spinner = output.spinner(removeId ? 'Removing header...' : 'Adding header...');

    try {
      if (removeId) {
        await gdocs.deleteHeader(documentId, removeId);
        spinner.success(`Removed header ${removeId}`);
        if (globalFlags.json) output.json({ removed: removeId });
      } else {
        const headerId = await gdocs.createHeader(documentId);
        if (text && headerId) {
          await gdocs.insertTextInHeaderFooter(documentId, headerId, text);
        }
        spinner.success(`Created header${text ? ` with text: "${text}"` : ''}`);
        if (globalFlags.json) output.json({ headerId, text });
      }
    } catch (error) {
      spinner.fail(removeId ? 'Failed to remove header' : 'Failed to add header');
      throw error;
    }
  },
};

const footerCommand: Command = {
  name: 'footer',
  description: 'Add, update, or remove document footer',
  args: [{ name: 'id', description: 'Document ID or URL', required: true }],
  options: [
    { name: 'text', short: 't', type: 'string', description: 'Footer text to add' },
    { name: 'remove', short: 'r', type: 'string', description: 'Footer ID to remove' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.id as string);
    const text = flags.text as string | undefined;
    const removeId = flags.remove as string | undefined;

    if (!text && !removeId) {
      output.error('Specify --text to add a footer or --remove <footerId> to remove one');
      return;
    }

    const spinner = output.spinner(removeId ? 'Removing footer...' : 'Adding footer...');

    try {
      if (removeId) {
        await gdocs.deleteFooter(documentId, removeId);
        spinner.success(`Removed footer ${removeId}`);
        if (globalFlags.json) output.json({ removed: removeId });
      } else {
        const footerId = await gdocs.createFooter(documentId);
        if (text && footerId) {
          await gdocs.insertTextInHeaderFooter(documentId, footerId, text);
        }
        spinner.success(`Created footer${text ? ` with text: "${text}"` : ''}`);
        if (globalFlags.json) output.json({ footerId, text });
      }
    } catch (error) {
      spinner.fail(removeId ? 'Failed to remove footer' : 'Failed to add footer');
      throw error;
    }
  },
};

const bookmarkCommand: Command = {
  name: 'bookmark',
  description: 'Create or delete named ranges (bookmarks)',
  args: [
    { name: 'action', description: 'create or delete', required: true },
    { name: 'document', description: 'Document ID or URL', required: true },
  ],
  options: [
    { name: 'name', short: 'n', description: 'Bookmark name (for create)', type: 'string' },
    { name: 'start', short: 's', description: 'Start index (for create)', type: 'number' },
    { name: 'end', short: 'e', description: 'End index (for create)', type: 'number' },
    { name: 'id', description: 'Named range ID (for delete)', type: 'string' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const action = args.action as string;
    const documentId = extractDocumentId(args.document as string);

    if (action === 'create') {
      const name = flags.name as string;
      const start = flags.start as number;
      const end = flags.end as number;

      if (!name || start === undefined || end === undefined) {
        output.error('Name (-n), start (-s), and end (-e) are required for create');
        return;
      }

      const spinner = output.spinner('Creating bookmark...');
      try {
        const rangeId = await gdocs.createNamedRange(documentId, name, start, end);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ namedRangeId: rangeId, name, start, end });
          return;
        }

        output.success(`Bookmark "${name}" created`);
        output.info(`  ID: ${c.dim(rangeId)}`);
      } catch (error) {
        spinner.fail('Failed to create bookmark');
        throw error;
      }
    } else if (action === 'delete') {
      const rangeId = flags.id as string;
      if (!rangeId) {
        output.error('Named range ID is required. Use --id RANGE_ID');
        return;
      }

      const spinner = output.spinner('Deleting bookmark...');
      try {
        await gdocs.deleteNamedRange(documentId, rangeId);
        spinner.stop();

        if (globalFlags.json) {
          output.json({ success: true, namedRangeId: rangeId });
          return;
        }

        output.success('Bookmark deleted');
      } catch (error) {
        spinner.fail('Failed to delete bookmark');
        throw error;
      }
    } else {
      output.error('Action must be: create or delete');
    }
  },
};

const footnoteCommand: Command = {
  name: 'footnote',
  description: 'Insert a footnote at a position',
  args: [
    { name: 'document', description: 'Document ID or URL', required: true },
    { name: 'position', description: 'Character index to insert footnote', required: true },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.document as string);
    const position = parseInt(args.position as string, 10);

    if (isNaN(position)) {
      output.error('Position must be a number');
      return;
    }

    const spinner = output.spinner('Inserting footnote...');

    try {
      const footnoteId = await gdocs.insertFootnote(documentId, position);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ footnoteId, position });
        return;
      }

      output.success('Footnote inserted');
      output.info(`  ID: ${c.dim(footnoteId)}`);
    } catch (error) {
      spinner.fail('Failed to insert footnote');
      throw error;
    }
  },
};

const marginCommand: Command = {
  name: 'margin',
  description: 'Set document margins (in points, 72pt = 1 inch)',
  args: [{ name: 'document', description: 'Document ID or URL', required: true }],
  options: [
    { name: 'top', short: 't', description: 'Top margin in points', type: 'number' },
    { name: 'bottom', short: 'b', description: 'Bottom margin in points', type: 'number' },
    { name: 'left', short: 'l', description: 'Left margin in points', type: 'number' },
    { name: 'right', short: 'r', description: 'Right margin in points', type: 'number' },
    { name: 'all', short: 'a', description: 'Set all margins to this value', type: 'number' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.document as string);
    const margins: { top?: number; bottom?: number; left?: number; right?: number } = {};

    if (flags.all !== undefined) {
      const all = flags.all as number;
      margins.top = all;
      margins.bottom = all;
      margins.left = all;
      margins.right = all;
    } else {
      if (flags.top !== undefined) margins.top = flags.top as number;
      if (flags.bottom !== undefined) margins.bottom = flags.bottom as number;
      if (flags.left !== undefined) margins.left = flags.left as number;
      if (flags.right !== undefined) margins.right = flags.right as number;
    }

    if (Object.keys(margins).length === 0) {
      output.error('At least one margin must be specified');
      return;
    }

    const spinner = output.spinner('Updating margins...');

    try {
      await gdocs.updateMargins(documentId, margins);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ success: true, margins });
        return;
      }

      output.success('Margins updated');
      if (margins.top !== undefined) output.info(`  Top: ${c.cyan(margins.top + 'pt')}`);
      if (margins.bottom !== undefined) output.info(`  Bottom: ${c.cyan(margins.bottom + 'pt')}`);
      if (margins.left !== undefined) output.info(`  Left: ${c.cyan(margins.left + 'pt')}`);
      if (margins.right !== undefined) output.info(`  Right: ${c.cyan(margins.right + 'pt')}`);
    } catch (error) {
      spinner.fail('Failed to update margins');
      throw error;
    }
  },
};

const columnsCommand: Command = {
  name: 'columns',
  description: 'Set column layout for a document section',
  args: [
    { name: 'document', description: 'Document ID or URL', required: true },
    { name: 'count', description: 'Number of columns (1-3)', required: true },
  ],
  options: [
    { name: 'at', short: 'a', description: 'Section start index (default: 1)', type: 'number' },
    { name: 'gap', short: 'g', description: 'Gap between columns in points (default: 36)', type: 'number' },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    if (!gdocs.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gdocs auth" first.');
      return;
    }

    const documentId = extractDocumentId(args.document as string);
    const count = parseInt(args.count as string, 10);
    const sectionIndex = (flags.at as number) || 1;
    const gap = (flags.gap as number) || 36;

    if (isNaN(count) || count < 1 || count > 3) {
      output.error('Column count must be 1, 2, or 3');
      return;
    }

    const spinner = output.spinner('Updating column layout...');

    try {
      await gdocs.updateSectionColumns(documentId, sectionIndex, count);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ success: true, columns: count, gap, sectionIndex });
        return;
      }

      output.success(`Column layout set to ${c.cyan(count.toString())} column${count > 1 ? 's' : ''}`);
      if (count > 1) {
        output.info(`  Gap: ${c.dim(gap + 'pt')}`);
      }
    } catch (error) {
      spinner.fail('Failed to update columns');
      throw error;
    }
  },
};

// ============================================================
// Export all commands
// ============================================================

export const commands: Command[] = [
  // Declarative commands
  ...declarativeCommands,
  // Manual commands
  listCommand,
  createCommand,
  getCommand,
  appendCommand,
  replaceCommand,
  renameCommand,
  deleteCommand,
  clearCommand,
  shareCommand,
  insertCommand,
  findCommand,
  commentsCommand,
  exportCommand,
  importCommand,
  formatCommand,
  styleCommand,
  bulletsCommand,
  tableCommand,
  linkCommand,
  pageBreakCommand,
  headerCommand,
  footerCommand,
  bookmarkCommand,
  footnoteCommand,
  marginCommand,
  columnsCommand,
];
