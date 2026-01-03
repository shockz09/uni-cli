/**
 * uni gmail read - Read an email
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const readCommand: Command = {
  name: 'read',
  description: 'Read an email',
  aliases: ['view', 'show'],
  args: [
    {
      name: 'id',
      description: 'Email ID',
      required: true,
    },
  ],
  examples: [
    'uni gmail read abc123',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const id = args.id;
    if (!id) {
      output.error('Please provide an email ID');
      return;
    }

    const spinner = output.spinner('Fetching email...');

    try {
      const email = await gmail.getEmail(id);
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
