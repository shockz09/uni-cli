/**
 * uni gmail send - Send email
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
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
    {
      name: 'attach',
      short: 'a',
      type: 'string',
      description: 'File path to attach (can use multiple times)',
      multiple: true,
    },
  ],
  examples: [
    'uni gmail send --to user@example.com --subject "Hello" --body "Message"',
    'uni gmail send -t me@example.com -s "Report" -b "See attached" --attach report.pdf',
    'uni gmail send -t user@example.com -s "Photos" -b "Here are the photos" -a photo1.jpg -a photo2.jpg',
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
    const attachRaw = flags.attach;
    const attachments: string[] = attachRaw
      ? Array.isArray(attachRaw)
        ? (attachRaw as string[])
        : [attachRaw as string]
      : [];

    if (!to || !subject || !body) {
      output.error('Please provide --to, --subject, and --body');
      return;
    }

    // Validate attachments exist
    for (const file of attachments) {
      const resolved = path.resolve(file);
      if (!fs.existsSync(resolved)) {
        output.error(`Attachment not found: ${file}`);
        return;
      }
    }

    const spinnerText = attachments.length > 0
      ? `Sending email with ${attachments.length} attachment(s)...`
      : 'Sending email...';
    const spinner = output.spinner(spinnerText);

    try {
      const result = await gmail.sendEmail(to, subject, body, attachments);
      spinner.success('Email sent');

      if (globalFlags.json) {
        output.json({ ...result, attachments: attachments.map((f) => path.basename(f)) });
        return;
      }

      console.log(c.dim(`Message ID: ${result.id}`));
      if (attachments.length > 0) {
        console.log(c.dim(`Attachments: ${attachments.map((f) => path.basename(f)).join(', ')}`));
      }
    } catch (error) {
      spinner.fail('Failed to send email');
      throw error;
    }
  },
};
