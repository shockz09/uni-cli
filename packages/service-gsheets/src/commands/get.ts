/**
 * uni gsheets get - Get spreadsheet data
 */

import type { Command, CommandContext } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const getCommand: Command = {
  name: 'get',
  description: 'Get spreadsheet data',
  args: [
    {
      name: 'id',
      description: 'Spreadsheet ID or URL',
      required: true,
    },
    {
      name: 'range',
      description: 'Cell range (e.g., A1:B10, Sheet1!A1:Z100)',
      required: false,
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
      name: 'data',
      short: 'd',
      type: 'boolean',
      description: 'Include all data',
    },
  ],
  examples: [
    'uni gsheets get 1abc123XYZ',
    'uni gsheets get 1abc123XYZ A1:B10',
    'uni gsheets get 1abc123XYZ --data',
    'uni gsheets get "https://docs.google.com/spreadsheets/d/1abc123XYZ/edit"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const range = args.range as string | undefined;
    const sheetName = flags.sheet as string | undefined;
    const includeData = flags.data as boolean;

    const spinner = output.spinner('Fetching spreadsheet...');

    try {
      const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);

      // Determine which sheet to use
      const sheets = spreadsheet.sheets || [];
      const targetSheet = sheetName
        ? sheets.find(s => s.properties.title.toLowerCase() === sheetName.toLowerCase())
        : sheets[0];

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      // Get data if range specified or --data flag
      let values: string[][] = [];
      if (range || includeData) {
        const dataRange = range || `${targetSheet.properties.title}!A1:Z1000`;
        values = await gsheets.getValues(spreadsheetId, dataRange);
      }

      spinner.success('Spreadsheet fetched');

      if (globalFlags.json) {
        output.json({
          id: spreadsheet.spreadsheetId,
          name: spreadsheet.properties.title,
          url: spreadsheet.spreadsheetUrl,
          sheets: sheets.map(s => ({
            name: s.properties.title,
            rows: s.properties.gridProperties?.rowCount,
            cols: s.properties.gridProperties?.columnCount,
          })),
          data: values.length > 0 ? values : undefined,
        });
        return;
      }

      console.log('');
      console.log(`\x1b[1m${spreadsheet.properties.title}\x1b[0m`);
      console.log(`\x1b[90mID: ${spreadsheet.spreadsheetId}\x1b[0m`);
      console.log('');

      // Show sheets info
      console.log('\x1b[1mSheets:\x1b[0m');
      for (const sheet of sheets) {
        const grid = sheet.properties.gridProperties;
        const dims = grid ? `${grid.rowCount} rows x ${grid.columnCount} cols` : '';
        const marker = sheet.properties.title === targetSheet.properties.title ? ' *' : '';
        console.log(`  ${sheet.properties.title}${marker} \x1b[90m(${dims})\x1b[0m`);
      }

      // Show data if available
      if (values.length > 0) {
        console.log('');
        console.log(`\x1b[1mData:\x1b[0m (${values.length} rows)`);
        console.log('');

        // Calculate column widths
        const colWidths: number[] = [];
        for (const row of values.slice(0, 20)) {
          row.forEach((cell, i) => {
            const len = String(cell || '').slice(0, 20).length;
            colWidths[i] = Math.max(colWidths[i] || 0, len);
          });
        }

        // Print header row
        if (values[0]) {
          const header = values[0].map((cell, i) => String(cell || '').padEnd(colWidths[i] || 0)).join(' | ');
          console.log(`  \x1b[1m${header}\x1b[0m`);
          console.log(`  ${'-'.repeat(header.length)}`);
        }

        // Print data rows (limit to 20)
        for (const row of values.slice(1, 21)) {
          const line = row.map((cell, i) => String(cell || '').slice(0, 20).padEnd(colWidths[i] || 0)).join(' | ');
          console.log(`  ${line}`);
        }

        if (values.length > 21) {
          console.log(`  \x1b[90m... and ${values.length - 21} more rows\x1b[0m`);
        }
      }

      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch spreadsheet');
      throw error;
    }
  },
};
