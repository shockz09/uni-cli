/**
 * uni gsheets chart-delete - Delete a chart
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const chartDeleteCommand: Command = {
  name: 'chart-delete',
  description: 'Delete a chart from spreadsheet',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'chartId', description: 'Chart ID to delete (use "charts" command to list)', required: true },
  ],
  options: [
    { name: 'force', short: 'f', type: 'boolean', description: 'Skip confirmation' },
  ],
  examples: [
    'uni gsheets chart-delete ID 123456789',
    'uni gsheets chart-delete ID 123456789 --force',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const chartId = parseInt(args.chartId as string, 10);

    if (isNaN(chartId)) {
      output.error('Invalid chart ID. Must be a number.');
      return;
    }

    // Get chart info first
    const charts = await gsheets.listCharts(spreadsheetId);
    const chart = charts.find(c => c.chartId === chartId);

    if (!chart) {
      output.error(`Chart with ID ${chartId} not found.`);
      return;
    }

    if (!flags.force && !output.isPiped()) {
      console.log(`${c.yellow('Warning:')} About to delete chart "${chart.title || '(untitled)'}" (ID: ${chartId})`);
      console.log(c.dim('Use --force to skip this warning'));
    }

    const spinner = output.spinner('Deleting chart...');

    try {
      await gsheets.deleteChart(spreadsheetId, chartId);
      spinner.success(`Deleted chart ${chartId}`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          chartId,
          title: chart.title,
          deleted: true,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Deleted:')} ${chart.title || '(untitled)'} (ID: ${chartId})`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to delete chart');
      throw error;
    }
  },
};
