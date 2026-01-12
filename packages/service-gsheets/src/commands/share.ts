/**
 * uni gsheets share - Share spreadsheet
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

const PUBLIC_KEYWORDS = ['anyone', 'public', 'anyone-with-link', 'link'];

export const shareCommand: Command = {
  name: 'share',
  description: 'Share spreadsheet (with email or publicly)',
  args: [
    {
      name: 'id',
      description: 'Spreadsheet ID or URL',
      required: true,
    },
    {
      name: 'target',
      description: 'Email address or "anyone" for public link',
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
    'uni gsheets share ID colleague@company.com',
    'uni gsheets share ID viewer@example.com --role reader',
    'uni gsheets share ID anyone',
    'uni gsheets share ID anyone --role reader',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const target = args.target as string;
    const role = (flags.role as string) === 'reader' ? 'reader' : 'writer';

    const isPublic = PUBLIC_KEYWORDS.includes(target.toLowerCase());

    const spinner = output.spinner(isPublic ? 'Making public...' : `Sharing with ${target}...`);

    try {
      if (isPublic) {
        await gsheets.sharePublic(spreadsheetId, role);
      } else {
        await gsheets.shareSpreadsheet(spreadsheetId, target, role);
      }

      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`;

      output.pipe(url);
      spinner.success(isPublic ? 'Spreadsheet is now public' : 'Spreadsheet shared');

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          url,
          sharedWith: isPublic ? 'anyone' : target,
          role,
          public: isPublic,
          success: true,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        if (isPublic) {
          console.log(`${c.green('Public link:')} ${url}`);
          console.log(c.dim(`Anyone with the link can ${role === 'writer' ? 'edit' : 'view'}`));
        } else {
          console.log(`${c.green(`Shared with ${target}`)} (${role} access)`);
          console.log(c.dim(`URL: ${url}`));
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to share spreadsheet');
      throw error;
    }
  },
};
