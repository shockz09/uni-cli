/**
 * uni gmail unsubscribe - Unsubscribe from mailing lists
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gmail } from '../api';

/**
 * Check if string looks like a Gmail message ID (hex string, 16+ chars)
 */
function looksLikeId(str: string): boolean {
  return /^[a-f0-9]{16,}$/i.test(str);
}

export const unsubscribeCommand: Command = {
  name: 'unsubscribe',
  description: 'Unsubscribe from a mailing list',
  aliases: ['unsub'],
  args: [
    {
      name: 'query',
      description: 'Email ID or search query to find the newsletter',
      required: true,
    },
  ],
  options: [
    {
      name: 'method',
      short: 'm',
      type: 'string',
      description: 'Unsubscribe method: auto (default), email, or url',
    },
    {
      name: 'dry-run',
      short: 'd',
      type: 'boolean',
      description: 'Show unsubscribe options without executing',
    },
  ],
  examples: [
    'uni gmail unsubscribe "newsletter"',
    'uni gmail unsubscribe "from:marketing@company.com"',
    'uni gmail unsubscribe 19b637d54e3f3c51',
    'uni gmail unsubscribe "promo" --dry-run',
    'uni gmail unsubscribe "updates" --method email',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const query = args.query as string;
    const method = (flags.method as string) || 'auto';
    const dryRun = flags['dry-run'] as boolean;

    if (!query) {
      output.error('Please provide an email ID or search query');
      return;
    }

    const spinner = output.spinner('Finding email...');

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
          spinner.fail(`No emails found matching: ${query}`);
          return;
        }
        emailId = results[0].id;
      }

      // Get full email with headers
      spinner.update('Fetching email headers...');
      const email = await gmail.getEmail(emailId);
      const from = gmail.getHeader(email, 'From') || 'Unknown sender';
      const subject = gmail.getHeader(email, 'Subject') || 'No subject';

      // Get unsubscribe info
      const unsubInfo = gmail.getUnsubscribeInfo(email);

      if (!unsubInfo) {
        spinner.fail('No unsubscribe option found in this email');
        output.info('');
        output.info(`From: ${c.cyan(from)}`);
        output.info(`Subject: ${subject}`);
        output.info('');
        output.info(c.dim('This email does not have a List-Unsubscribe header.'));
        output.info(c.dim('Look for an unsubscribe link in the email body instead.'));
        return;
      }

      spinner.stop();

      // Display email info
      output.info('');
      output.info(`${c.bold('Email:')} ${subject}`);
      output.info(`${c.bold('From:')} ${c.cyan(from)}`);
      output.info('');

      // Display unsubscribe options
      output.info(c.bold('Unsubscribe Options:'));
      if (unsubInfo.url) {
        output.info(`  ${c.green('URL:')} ${unsubInfo.url}`);
        if (unsubInfo.oneClick) {
          output.info(`        ${c.dim('(One-click unsubscribe supported)')}`);
        }
      }
      if (unsubInfo.mailto) {
        output.info(`  ${c.green('Email:')} ${unsubInfo.mailto}`);
      }
      output.info('');

      if (globalFlags.json) {
        output.json({
          emailId,
          from,
          subject,
          unsubscribe: unsubInfo,
          dryRun,
        });
        if (dryRun) return;
      }

      if (dryRun) {
        output.info(c.yellow('Dry run - no action taken'));
        return;
      }

      // Execute unsubscribe
      const useUrl = method === 'url' || (method === 'auto' && unsubInfo.url);
      const useEmail = method === 'email' || (method === 'auto' && !unsubInfo.url && unsubInfo.mailto);

      if (useUrl && unsubInfo.url) {
        const unsubSpinner = output.spinner('Unsubscribing via URL...');
        try {
          const success = await gmail.unsubscribeViaUrl(unsubInfo.url, unsubInfo.oneClick);
          if (success) {
            unsubSpinner.success('Unsubscribe request sent successfully');
            output.info(c.dim('Note: Some services may require confirmation via email.'));
          } else {
            unsubSpinner.fail('Unsubscribe request may have failed');
            output.info(c.dim('Try using --method email or visit the URL manually.'));
          }
        } catch (error) {
          unsubSpinner.fail('Failed to unsubscribe via URL');
          if (unsubInfo.mailto) {
            output.info(c.dim('Trying email method instead...'));
            await unsubscribeViaEmail(output, unsubInfo.mailto);
          } else {
            throw error;
          }
        }
      } else if (useEmail && unsubInfo.mailto) {
        await unsubscribeViaEmail(output, unsubInfo.mailto);
      } else {
        output.error('No valid unsubscribe method available');
        if (method !== 'auto') {
          output.info(`Requested method "${method}" is not available for this email.`);
        }
      }
    } catch (error) {
      spinner.fail('Failed to unsubscribe');
      throw error;
    }
  },
};

async function unsubscribeViaEmail(output: CommandContext['output'], mailto: string): Promise<void> {
  const spinner = output.spinner('Sending unsubscribe email...');
  try {
    await gmail.unsubscribeViaEmail(mailto);
    spinner.success('Unsubscribe email sent');
    output.info(c.dim('An email has been sent to request unsubscription.'));
  } catch (error) {
    spinner.fail('Failed to send unsubscribe email');
    throw error;
  }
}
