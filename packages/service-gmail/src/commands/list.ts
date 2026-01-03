/**
 * uni gmail list - List emails
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List emails',
  aliases: ['ls', 'inbox'],
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Number of emails',
      default: 10,
    },
    {
      name: 'query',
      short: 'q',
      type: 'string',
      description: 'Search query (Gmail search syntax)',
    },
    {
      name: 'unread',
      short: 'u',
      type: 'boolean',
      description: 'Only unread emails',
      default: false,
    },
    {
      name: 'all',
      short: 'a',
      type: 'boolean',
      description: 'Show all emails (including promotions, social)',
      default: false,
    },
  ],
  examples: [
    'uni gmail list',
    'uni gmail list --limit 20',
    'uni gmail list --query "from:github.com"',
    'uni gmail list --unread',
    'uni gmail list --all',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!gmail.hasCredentials()) {
      output.error('Google credentials not configured.');
      return;
    }

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching emails...');

    try {
      let query = flags.query as string | undefined;

      // Default to primary inbox only (exclude promotions, social, updates)
      if (!flags.all) {
        query = query ? `${query} category:primary` : 'category:primary';
      }

      if (flags.unread) {
        query = query ? `${query} is:unread` : 'is:unread';
      }

      const messages = await gmail.listEmails({
        maxResults: flags.limit as number,
        q: query,
      });

      if (messages.length === 0) {
        spinner.success('No emails found');
        return;
      }

      // Fetch details for each message
      const emails = await Promise.all(
        messages.slice(0, flags.limit as number).map(m => gmail.getEmail(m.id))
      );

      spinner.success(`Found ${emails.length} emails`);

      if (globalFlags.json) {
        output.json(emails);
        return;
      }

      console.log('');
      for (const email of emails) {
        const from = gmail.getHeader(email, 'From') || 'Unknown';
        const subject = gmail.getHeader(email, 'Subject') || '(no subject)';
        const date = email.internalDate
          ? new Date(parseInt(email.internalDate)).toLocaleDateString()
          : '';

        const isUnread = email.labelIds?.includes('UNREAD');
        const marker = isUnread ? '\x1b[1m●\x1b[0m ' : '  ';

        // Parse sender name
        const fromMatch = from.match(/^(.+?)\s*<.+>$/);
        const fromName = fromMatch ? fromMatch[1].replace(/"/g, '') : from;

        console.log(`${marker}\x1b[1m${subject}\x1b[0m`);
        console.log(`   \x1b[36m${fromName}\x1b[0m  \x1b[90m${date}\x1b[0m`);
        console.log(`   \x1b[90m${email.snippet?.slice(0, 80)}...\x1b[0m`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch emails');
      throw error;
    }
  },
};
