/**
 * uni gsheets share - Share spreadsheet with email
 */

import type { Command, CommandContext } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const shareCommand: Command = {
  name: 'share',
  description: 'Share spreadsheet with email',
  args: [
    {
      name: 'id',
      description: 'Spreadsheet ID or URL',
      required: true,
    },
    {
      name: 'email',
      description: 'Email address to share with',
      required: true,
    },
  ],
  options: [
    {
      name: 'role',
      short: 'r',
      type: 'string',
      description: 'Permission role: reader or writer (default: writer)',
      default: 'writer',
    },
  ],
  examples: [
    'uni gsheets share 1abc123XYZ colleague@company.com',
    'uni gsheets share 1abc123XYZ viewer@example.com --role reader',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const email = args.email as string;
    const role = (flags.role as string) === 'reader' ? 'reader' : 'writer';

    const spinner = output.spinner(`Sharing with ${email}...`);

    try {
      await gsheets.shareSpreadsheet(spreadsheetId, email, role);

      spinner.success('Spreadsheet shared');

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          sharedWith: email,
          role,
          success: true,
        });
        return;
      }

      console.log('');
      console.log(`\x1b[32mShared with ${email}\x1b[0m (${role} access)`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to share spreadsheet');
      throw error;
    }
  },
};
