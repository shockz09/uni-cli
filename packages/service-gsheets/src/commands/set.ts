/**
 * uni gsheets set - Set cell value(s)
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const setCommand: Command = {
  name: 'set',
  description: 'Set cell value',
  args: [
    {
      name: 'id',
      description: 'Spreadsheet ID or URL',
      required: true,
    },
    {
      name: 'range',
      description: 'Cell or range (e.g., A1, B2:C5)',
      required: true,
    },
    {
      name: 'value',
      description: 'Value to set (or comma-separated values for range)',
      required: true,
    },
  ],
  options: [
    {
      name: 'sheet',
      short: 's',
      type: 'string',
      description: 'Sheet name (default: first sheet)',
    },
  ],
  examples: [
    'uni gsheets set 1abc123XYZ A1 "Hello"',
    'uni gsheets set 1abc123XYZ B2 "=SUM(A1:A10)"',
    'uni gsheets set 1abc123XYZ A1 100',
    'uni gsheets set 1abc123XYZ --sheet "Data" A1 "Value"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    let range = args.range as string;
    const value = args.value as string;
    const sheetName = flags.sheet as string | undefined;

    // Prepend sheet name if specified
    if (sheetName && !range.includes('!')) {
      range = `${sheetName}!${range}`;
    }

    const spinner = output.spinner(`Setting ${range}...`);

    try {
      await gsheets.setValue(spreadsheetId, range, value);

      spinner.success(`Cell ${range} updated`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          range,
          value,
          success: true,
        });
        return;
      }

      console.log('');
      console.log(`${c.green(`Set ${range} to:`)} ${value}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to set cell value');
      throw error;
    }
  },
};
