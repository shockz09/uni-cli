/**
 * uni linear attachments - Manage issue attachments
 */

import type { Command, CommandContext } from '@uni/shared';
import { linear, linearOAuth } from '../api';

export const attachmentsCommand: Command = {
  name: 'attachments',
  aliases: ['attachment', 'attach', 'files'],
  description: 'List, add, and remove attachments from issues',
  args: [
    { name: 'issueId', description: 'Issue ID or identifier', required: true },
  ],
  options: [
    { name: 'add', short: 'a', type: 'string', description: 'Add attachment (URL)' },
    { name: 'title', short: 't', type: 'string', description: 'Attachment title' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete attachment by ID' },
  ],
  examples: [
    'uni linear attachments ENG-123',
    'uni linear attachments ENG-123 --add "https://example.com/doc.pdf"',
    'uni linear attachments ENG-123 --add "https://figma.com/..." --title "Design mockup"',
    'uni linear attachments ENG-123 --delete ATTACHMENT_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!linearOAuth.isAuthenticated()) {
      output.error('Not authenticated. Run "uni linear auth" first.');
      return;
    }

    const issueId = args.issueId as string;

    // Delete attachment
    if (flags.delete) {
      const spinner = output.spinner('Deleting attachment...');
      try {
        await linear.deleteAttachment(flags.delete as string);
        spinner.success('Attachment deleted');
        if (globalFlags.json) output.json({ deleted: true, id: flags.delete });
        return;
      } catch (error) {
        spinner.fail('Failed to delete attachment');
        throw error;
      }
    }

    // Add attachment
    if (flags.add) {
      const spinner = output.spinner('Adding attachment...');
      try {
        const attachment = await linear.createAttachment(
          issueId,
          flags.add as string,
          flags.title as string | undefined
        );
        spinner.success(`Added: ${attachment.title}`);

        if (globalFlags.json) {
          output.json(attachment);
        } else {
          output.info(`  ID: ${attachment.id}`);
          output.info(`  URL: ${attachment.url}`);
        }
        return;
      } catch (error) {
        spinner.fail('Failed to add attachment');
        throw error;
      }
    }

    // List attachments
    const spinner = output.spinner('Fetching attachments...');
    try {
      const attachments = await linear.listAttachments(issueId);
      spinner.stop();

      if (globalFlags.json) {
        output.json(attachments);
        return;
      }

      if (attachments.length === 0) {
        output.info('No attachments found for this issue.');
        return;
      }

      output.info(`Attachments (${attachments.length}):\n`);
      for (const att of attachments) {
        const date = new Date(att.createdAt).toLocaleDateString();
        const creator = att.creator?.name || 'Unknown';
        output.info(`  ${att.title}`);
        output.info(`    URL: ${att.url}`);
        output.info(`    Added: ${date} by ${creator}`);
        output.info(`    ID: ${att.id}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch attachments');
      throw error;
    }
  },
};
