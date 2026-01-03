/**
 * uni gmail delete - Delete an email
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

function looksLikeId(str: string): boolean {
  return /^[a-f0-9]{16,}$/i.test(str);
}

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete an email (moves to trash)',
  aliases: ['trash', 'rm', 'remove'],
  args: [
    {
      name: 'query',
      description: 'Email ID or search query',
      required: true,
    },
  ],
  options: [
    {
      name: 'permanent',
      short: 'p',
      type: 'boolean',
      description: 'Permanently delete (skip trash)',
      default: false,
    },
  ],
  examples: [
    'uni gmail delete 19b637d54e3f3c51',
    'uni gmail delete "Newsletter from spam"',
    'uni gmail delete "old email" --permanent',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    const query = args.query as string;
    const permanent = flags.permanent as boolean;

    let emailId: string;
    let subject = '';

    if (looksLikeId(query)) {
      emailId = query;
    } else {
      const results = await gmail.listEmails({ q: query, maxResults: 1 });
      if (!results.length) {
        output.error('No emails found matching your query');
        return;
      }
      emailId = results[0].id;
    }

    // Get email details for confirmation message
    const email = await gmail.getEmail(emailId);
    subject = gmail.getHeader(email, 'Subject') || '(no subject)';

    if (permanent) {
      await gmail.deleteEmail(emailId);
    } else {
      await gmail.trashEmail(emailId);
    }

    if (globalFlags.json) {
      output.json({ id: emailId, subject, deleted: true, permanent });
      return;
    }

    output.success(`${permanent ? 'Deleted' : 'Trashed'}: ${subject}`);
  },
};
