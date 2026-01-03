/**
 * uni gmail read - Read an email
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

/**
 * Check if string looks like a Gmail message ID (hex string, 16+ chars)
 */
function looksLikeId(str: string): boolean {
  return /^[a-f0-9]{16,}$/i.test(str);
}

export const readCommand: Command = {
  name: 'read',
  description: 'Read an email by ID or search query',
  aliases: ['view', 'show'],
  args: [
    {
      name: 'query',
      description: 'Email ID or search query (subject, sender, etc.)',
      required: true,
    },
  ],
  examples: [
    'uni gmail read 19b637d54e3f3c51',
    'uni gmail read "Your Booking is Ticketed"',
    'uni gmail read "from:amazon order"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const query = args.query as string;
    if (!query) {
      output.error('Please provide an email ID or search query');
      return;
    }

    const spinner = output.spinner('Fetching email...');

    try {
      let emailId: string;

      // Check if it looks like an ID or a search query
      if (looksLikeId(query)) {
        emailId = query;
      } else {
        // Search for matching emails
        spinner.update('Searching for email...');
        const results = await gmail.listEmails({ q: query, maxResults: 1 });

        if (!results.length) {
          spinner.fail('No emails found matching your query');
          return;
        }

        emailId = results[0].id;
      }

      spinner.update('Loading email...');
      const email = await gmail.getEmail(emailId);
      spinner.success('Email loaded');

      if (globalFlags.json) {
        output.json(email);
        return;
      }

      const from = gmail.getHeader(email, 'From') || 'Unknown';
      const to = gmail.getHeader(email, 'To') || '';
      const subject = gmail.getHeader(email, 'Subject') || '(no subject)';
      const date = gmail.getHeader(email, 'Date') || '';
      const body = gmail.decodeBody(email);

      console.log('');
      console.log(`\x1b[1m${subject}\x1b[0m`);
      console.log(`\x1b[36mFrom:\x1b[0m ${from}`);
      console.log(`\x1b[36mTo:\x1b[0m ${to}`);
      console.log(`\x1b[36mDate:\x1b[0m ${date}`);
      console.log('\n\x1b[90m─── Body ───\x1b[0m\n');
      console.log(body);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch email');
      throw error;
    }
  },
};
