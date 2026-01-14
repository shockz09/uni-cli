/**
 * uni gmail draft - Manage drafts
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const draftCommand: Command = {
  name: 'draft',
  aliases: ['drafts'],
  description: 'Create and manage drafts',
  options: [
    { name: 'create', short: 'c', type: 'boolean', description: 'Create a new draft' },
    { name: 'to', short: 't', type: 'string', description: 'Recipient email (for create)' },
    { name: 'subject', short: 's', type: 'string', description: 'Subject (for create)' },
    { name: 'body', short: 'b', type: 'string', description: 'Body text (for create)' },
    { name: 'delete', short: 'd', type: 'string', description: 'Delete draft by ID' },
    { name: 'send', type: 'string', description: 'Send draft by ID' },
    { name: 'view', short: 'v', type: 'string', description: 'View draft by ID' },
    { name: 'limit', short: 'n', type: 'string', description: 'Number of drafts to list (default: 10)' },
  ],
  examples: [
    'uni gmail draft',
    'uni gmail draft --create --to "user@example.com" --subject "Hello" --body "Message"',
    'uni gmail draft --view DRAFT_ID',
    'uni gmail draft --send DRAFT_ID',
    'uni gmail draft --delete DRAFT_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    // Create draft
    if (flags.create) {
      if (!flags.to || !flags.subject || !flags.body) {
        output.error('Create requires --to, --subject, and --body');
        return;
      }
      const spinner = output.spinner('Creating draft...');
      try {
        const draft = await gmail.createDraft(
          flags.to as string,
          flags.subject as string,
          flags.body as string
        );
        spinner.success(`Draft created: ${draft.id}`);
        if (globalFlags.json) output.json(draft);
        return;
      } catch (error) {
        spinner.fail('Failed to create draft');
        throw error;
      }
    }

    // View draft
    if (flags.view) {
      const spinner = output.spinner('Fetching draft...');
      try {
        const draft = await gmail.getDraft(flags.view as string);
        spinner.stop();

        if (globalFlags.json) {
          output.json(draft);
          return;
        }

        const to = gmail.getHeader(draft.message, 'To') || 'Unknown';
        const subject = gmail.getHeader(draft.message, 'Subject') || 'No Subject';
        const body = gmail.decodeBody(draft.message);

        output.log(`Draft: ${draft.id}\n`);
        output.log(`To: ${to}`);
        output.log(`Subject: ${subject}`);
        output.log(`\n${body}`);
        return;
      } catch (error) {
        spinner.fail('Failed to fetch draft');
        throw error;
      }
    }

    // Send draft
    if (flags.send) {
      const spinner = output.spinner('Sending draft...');
      try {
        const result = await gmail.sendDraft(flags.send as string);
        spinner.success(`Draft sent: ${result.id}`);
        if (globalFlags.json) output.json(result);
        return;
      } catch (error) {
        spinner.fail('Failed to send draft');
        throw error;
      }
    }

    // Delete draft
    if (flags.delete) {
      const spinner = output.spinner('Deleting draft...');
      try {
        await gmail.deleteDraft(flags.delete as string);
        spinner.success('Draft deleted');
        return;
      } catch (error) {
        spinner.fail('Failed to delete draft');
        throw error;
      }
    }

    // List drafts
    const limit = parseInt((flags.limit as string) || '10', 10);
    const spinner = output.spinner('Fetching drafts...');
    try {
      const drafts = await gmail.listDrafts(limit);
      spinner.stop();

      if (globalFlags.json) {
        output.json(drafts);
        return;
      }

      if (drafts.length === 0) {
        output.log('No drafts found.');
        return;
      }

      output.log(`Found ${drafts.length} draft(s):\n`);
      for (const draft of drafts) {
        output.log(`  ID: ${draft.id}`);
        output.log(`  Message ID: ${draft.message.id}`);
        output.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch drafts');
      throw error;
    }
  },
};
