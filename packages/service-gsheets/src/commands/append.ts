/**
 * uni gsheets append - Append row to spreadsheet
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const appendCommand: Command = {
  name: 'append',
  description: 'Append row to spreadsheet',
  args: [
    {
      name: 'id',
      description: 'Spreadsheet ID or URL',
      required: true,
    },
    {
      name: 'values',
      description: 'Comma-separated values or multiple arguments',
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
    'uni gsheets append 1abc123XYZ "John,Doe,john@example.com"',
    'uni gsheets append 1abc123XYZ "Item,100,In Stock"',
    'uni gsheets append 1abc123XYZ --sheet "Data" "Row,Data,Here"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const valuesStr = args.values as string;
    const sheetName = flags.sheet as string | undefined;

    // Parse comma-separated values
    const rowValues = valuesStr.split(',').map(v => v.trim());
    const range = sheetName ? `${sheetName}!A:A` : 'A:A';

    const spinner = output.spinner('Appending row...');

    try {
      await gsheets.appendRows(spreadsheetId, range, [rowValues]);

      spinner.success('Row appended');

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          values: rowValues,
          success: true,
        });
        return;
      }

      console.log('');
      console.log(`${c.green('Appended row:')} ${rowValues.join(' | ')}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to append row');
      throw error;
    }
  },
};
