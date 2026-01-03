/**
 * uni gmail send - Send email
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const sendCommand: Command = {
  name: 'send',
  description: 'Send an email',
  aliases: ['compose', 'new'],
  options: [
    {
      name: 'to',
      short: 't',
      type: 'string',
      description: 'Recipient email',
      required: true,
    },
    {
      name: 'subject',
      short: 's',
      type: 'string',
      description: 'Email subject',
      required: true,
    },
    {
      name: 'body',
      short: 'b',
      type: 'string',
      description: 'Email body',
      required: true,
    },
  ],
  examples: [
    'uni gmail send --to user@example.com --subject "Hello" --body "Message"',
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

    const to = flags.to as string;
    const subject = flags.subject as string;
    const body = flags.body as string;

    if (!to || !subject || !body) {
      output.error('Please provide --to, --subject, and --body');
      return;
    }

    const spinner = output.spinner('Sending email...');

    try {
      const result = await gmail.sendEmail(to, subject, body);
      spinner.success('Email sent');

      if (globalFlags.json) {
        output.json(result);
        return;
      }

      console.log(`\x1b[90mMessage ID: ${result.id}\x1b[0m`);
    } catch (error) {
      spinner.fail('Failed to send email');
      throw error;
    }
  },
};
