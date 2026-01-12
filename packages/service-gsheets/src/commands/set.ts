/**
 * uni gsheets set - Set cell value(s)
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse values string into 2D array for batch writes
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

/**
 * Check if a range spans multiple cells (e.g., A1:C3)
 */
function isRangeMultiCell(range: string): boolean {
  // Remove sheet name prefix if present
  const cellPart = range.includes('!') ? range.split('!')[1] : range;
  return cellPart.includes(':');
}

export const setCommand: Command = {
  name: 'set',
  description: 'Set cell value(s)',
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
      description: 'Value(s) - use | for columns, \\n for rows',
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
    'uni gsheets set ID A1 "Hello"',
    'uni gsheets set ID B2 "=SUM(A1:A10)"',
    'uni gsheets set ID A1:C1 "Name | Age | Email"',
    'uni gsheets set ID A1:B3 "Header1|Header2\\nVal1|Val2\\nVal3|Val4"',
    'uni gsheets set ID --sheet "Data" A1 "Value"',
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

    // Check if this is a batch write (multi-cell range or multi-value input)
    const isMultiCell = isRangeMultiCell(range);
    const hasDelimiter = value.includes('|') || value.includes('\t') || value.includes('\\n') || value.includes('\n');
    const isBatch = isMultiCell || hasDelimiter;

    const spinner = output.spinner(`Setting ${range}...`);

    try {
      if (isBatch) {
        // Batch write: parse values into 2D array
        const values = parseValues(value);
        const cellCount = values.reduce((sum, row) => sum + row.length, 0);

        await gsheets.setValues(spreadsheetId, range, values);

        output.pipe(`${cellCount}`);
        spinner.success(`${cellCount} cells updated in ${range}`);

        if (globalFlags.json) {
          output.json({
            spreadsheetId,
            range,
            cellsUpdated: cellCount,
            rows: values.length,
            values,
            success: true,
          });
          return;
        }

        if (!output.isPiped()) {
          console.log('');
          console.log(`${c.green(`Updated ${range}:`)} ${values.length} rows, ${cellCount} cells`);
          for (const row of values.slice(0, 3)) {
            console.log(`  ${row.join(' | ')}`);
          }
          if (values.length > 3) {
            console.log(c.dim(`  ... and ${values.length - 3} more rows`));
          }
          console.log('');
        }
      } else {
        // Single cell write
        await gsheets.setValue(spreadsheetId, range, value);

        output.pipe(value);
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

        if (!output.isPiped()) {
          console.log('');
          console.log(`${c.green(`Set ${range} to:`)} ${value}`);
          console.log('');
        }
      }
    } catch (error) {
      spinner.fail('Failed to set cell value(s)');
      throw error;
    }
  },
};
