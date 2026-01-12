/**
 * uni gsheets append - Append row(s) to spreadsheet
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse values string into rows and columns
 * Supports: pipe (|), comma (,), and tab delimiters
 * Newlines (\n) separate rows
 */
function parseValues(valuesStr: string): string[][] {
  // Detect delimiter: prefer pipe, then tab, then comma
  let delimiter = ',';
  if (valuesStr.includes('|')) {
    delimiter = '|';
  } else if (valuesStr.includes('\t')) {
    delimiter = '\t';
  }

  // Split by newlines for multiple rows
  const lines = valuesStr.split(/\\n|\n/).filter(line => line.trim());

  return lines.map(line =>
    line.split(delimiter).map(v => v.trim())
  );
}

export const appendCommand: Command = {
  name: 'append',
  description: 'Append row(s) to spreadsheet',
  args: [
    {
      name: 'id',
      description: 'Spreadsheet ID or URL',
      required: true,
    },
    {
      name: 'values',
      description: 'Values separated by | or , (use \\n for multiple rows)',
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
    {
      name: 'range',
      short: 'r',
      type: 'string',
      description: 'Starting range (default: A:A)',
    },
  ],
  examples: [
    'uni gsheets append ID "Name | Age | Email"',
    'uni gsheets append ID "John,Doe,john@example.com"',
    'uni gsheets append ID "Row1|Data|Here\\nRow2|More|Data"',
    'uni gsheets append ID --sheet "Data" "Item | 100 | In Stock"',
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
    const rangeArg = flags.range as string | undefined;

    // Parse values with delimiter detection
    const rows = parseValues(valuesStr);
    const range = rangeArg
      ? (sheetName ? `${sheetName}!${rangeArg}` : rangeArg)
      : (sheetName ? `${sheetName}!A:A` : 'A:A');

    const spinner = output.spinner(`Appending ${rows.length} row(s)...`);

    try {
      await gsheets.appendRows(spreadsheetId, range, rows);

      output.pipe(`${rows.length}`);
      spinner.success(`${rows.length} row(s) appended`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          rowsAppended: rows.length,
          values: rows,
          success: true,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        for (const row of rows.slice(0, 5)) {
          console.log(`${c.green('+')} ${row.join(' | ')}`);
        }
        if (rows.length > 5) {
          console.log(c.dim(`... and ${rows.length - 5} more rows`));
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to append row(s)');
      throw error;
    }
  },
};
