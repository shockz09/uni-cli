/**
 * uni gsheets chart-update - Update chart properties
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const chartUpdateCommand: Command = {
  name: 'chart-update',
  description: 'Update chart title or properties',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'chartId', description: 'Chart ID to update', required: true },
  ],
  options: [
    { name: 'title', short: 't', type: 'string', description: 'New chart title' },
  ],
  examples: [
    'uni gsheets chart-update ID 123456 --title "Sales Report 2024"',
    'uni gsheets chart-update ID 789 --title "Monthly Revenue"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const chartId = parseInt(args.chartId as string, 10);
    const title = flags.title as string | undefined;

    if (isNaN(chartId)) {
      output.error('Chart ID must be a number');
      return;
    }

    if (!title) {
      output.error('Specify --title to update the chart');
      return;
    }

    const spinner = output.spinner('Updating chart...');

    try {
      await gsheets.updateChartTitle(spreadsheetId, chartId, title);
      spinner.success(`Updated chart ${chartId} title to "${title}"`);

      if (globalFlags.json) {
        output.json({ chartId, title });
      }

    } catch (error) {
      spinner.fail('Failed to update chart');
      throw error;
    }
  },
};
