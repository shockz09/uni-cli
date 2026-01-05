/**
 * uni gmail search - Search emails
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gmail } from '../api';

export const searchCommand: Command = {
  name: 'search',
  description: 'Search emails (full-text search in subject, body, sender)',
  aliases: ['find', 'query'],
  args: [
    {
      name: 'query',
      description: 'Search term (searches everywhere: subject, body, sender)',
      required: true,
    },
  ],
  options: [
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Max results (default: 10)',
      default: 10,
    },
    {
      name: 'all',
      short: 'a',
      type: 'boolean',
      description: 'Include promotions, social, updates',
      default: false,
    },
  ],
  examples: [
    'uni gmail search "flight booking"',
    'uni gmail search "indigo PNR"',
    'uni gmail search "invoice" -n 20',
    'uni gmail search "amazon order" --all',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const searchQuery = args.query as string;
    const limit = (flags.limit as number) || 10;

    if (!gmail.hasCredentials()) {
      output.error('Google credentials not configured.');
      return;
    }

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const spinner = output.spinner(`Searching for "${searchQuery}"...`);

    try {
      // Build Gmail search query
      // By default, Gmail searches subject, body, and sender
      let query = searchQuery;

      // Restrict to primary inbox unless --all
      if (!flags.all) {
        query = `${query} category:primary`;
      }

      const messages = await gmail.listEmails({
        maxResults: limit,
        q: query,
      });

      if (messages.length === 0) {
        spinner.success('No emails found');
        console.log(c.dim(`\nTry: uni gmail search "${searchQuery}" --all`));
        return;
      }

      // Fetch details for each message
      const emails = await Promise.all(
        messages.slice(0, limit).map(m => gmail.getEmail(m.id))
      );

      spinner.success(`Found ${emails.length} email(s)`);

      if (globalFlags.json) {
        output.json(emails.map(email => ({
          id: email.id,
          threadId: email.threadId,
          subject: gmail.getHeader(email, 'Subject'),
          from: gmail.getHeader(email, 'From'),
          date: email.internalDate
            ? new Date(parseInt(email.internalDate, 10)).toISOString()
            : null,
          snippet: email.snippet,
          labelIds: email.labelIds,
        })));
        return;
      }

      console.log('');
      for (const email of emails) {
        const from = gmail.getHeader(email, 'From') || 'Unknown';
        const subject = gmail.getHeader(email, 'Subject') || '(no subject)';
        const date = email.internalDate
          ? new Date(parseInt(email.internalDate, 10)).toLocaleDateString()
          : '';

        const isUnread = email.labelIds?.includes('UNREAD');
        const marker = isUnread ? `${c.bold('●')} ` : '  ';

        // Parse sender name
        const fromMatch = from.match(/^(.+?)\s*<.+>$/);
        const fromName = fromMatch ? fromMatch[1].replace(/"/g, '') : from;

        console.log(`${marker}${c.bold(subject)}`);
        console.log(`   ${c.cyan(fromName)}  ${c.dim(date)}`);
        console.log(`   ${c.dim(email.snippet?.slice(0, 80) + '...')}`);
        console.log(`   ${c.dim(`ID: ${email.id}`)}`);
        console.log('');
      }

      console.log(c.dim(`Tip: Use "uni gmail read <id>" to read full email`));
    } catch (error) {
      spinner.fail('Search failed');
      throw error;
    }
  },
};
