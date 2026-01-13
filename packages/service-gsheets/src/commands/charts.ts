/**
 * uni gsheets charts - List all charts in a spreadsheet
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Convert column index to letter (0 = A, 1 = B, etc.)
 */
function colToLetter(col: number): string {
  let letter = '';
  let temp = col - 1;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter || 'A';
}

export const chartsCommand: Command = {
  name: 'charts',
  description: 'List all charts in a spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Filter by sheet name' },
  ],
  examples: [
    'uni gsheets charts ID',
    'uni gsheets charts ID --sheet "Dashboard"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const sheetFilter = flags.sheet as string | undefined;

    const spinner = output.spinner('Fetching charts...');

    try {
      let charts = await gsheets.listCharts(spreadsheetId);

      // Filter by sheet if specified
      if (sheetFilter) {
        charts = charts.filter(c => c.sheetName.toLowerCase() === sheetFilter.toLowerCase());
      }

      spinner.success(`Found ${charts.length} chart(s)`);

      if (globalFlags.json) {
        output.json({ spreadsheetId, charts });
        return;
      }

      if (charts.length === 0) {
        if (!output.isPiped()) {
          console.log('');
          console.log(c.dim('No charts found.'));
          console.log('');
        }
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.bold('Charts in spreadsheet:')}`);
        console.log('');

        for (const chart of charts) {
          const posStr = chart.position
            ? `${colToLetter(chart.position.col)}${chart.position.row}`
            : 'unknown';
          const sizeStr = chart.size?.width && chart.size?.height
            ? `${chart.size.width}x${chart.size.height}`
            : 'default';

          console.log(`  ${c.green(`ID: ${chart.chartId}`)}`);
          console.log(`    Title: ${chart.title || '(untitled)'}`);
          console.log(`    Type: ${chart.chartType || 'unknown'}`);
          console.log(`    Sheet: ${chart.sheetName}`);
          console.log(`    Position: ${posStr}, Size: ${sizeStr}`);
          console.log('');
        }
      } else {
        // Piped output - one chart ID per line
        for (const chart of charts) {
          output.pipe(String(chart.chartId));
        }
      }
    } catch (error) {
      spinner.fail('Failed to list charts');
      throw error;
    }
  },
};
