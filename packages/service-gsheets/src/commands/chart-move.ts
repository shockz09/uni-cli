/**
 * uni gsheets chart-move - Move or resize a chart
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

/**
 * Parse A1 notation cell into row/column indices
 */
function parseCell(cell: string): { rowIndex: number; columnIndex: number } {
  const match = cell.match(/^([A-Z]+)(\d+)$/i);
  if (!match) {
    throw new Error(`Invalid cell: ${cell}`);
  }

  const colToIndex = (col: string) => {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
      index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
  };

  return {
    columnIndex: colToIndex(match[1].toUpperCase()),
    rowIndex: parseInt(match[2], 10) - 1,
  };
}

export const chartMoveCommand: Command = {
  name: 'chart-move',
  description: 'Move or resize an existing chart',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'chartId', description: 'Chart ID to move', required: true },
    { name: 'position', description: 'New anchor cell (e.g., I2)', required: true },
  ],
  options: [
    { name: 'width', short: 'w', type: 'number', description: 'New width in pixels' },
    { name: 'height', short: 'h', type: 'number', description: 'New height in pixels' },
  ],
  examples: [
    'uni gsheets chart-move ID 123456789 I2',
    'uni gsheets chart-move ID 123456789 A20 --width 800 --height 400',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    const chartId = parseInt(args.chartId as string, 10);
    const positionStr = args.position as string;
    const width = flags.width as number | undefined;
    const height = flags.height as number | undefined;

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

    const spinner = output.spinner('Moving chart...');

    try {
      const anchorCell = parseCell(positionStr);

      await gsheets.moveChart(
        spreadsheetId,
        chartId,
        chart.sheetId,
        anchorCell,
        width,
        height
      );

      spinner.success(`Moved chart ${chartId} to ${positionStr}`);

      if (globalFlags.json) {
        output.json({
          spreadsheetId,
          chartId,
          newPosition: positionStr,
          width,
          height,
        });
        return;
      }

      if (!output.isPiped()) {
        console.log('');
        console.log(`${c.green('Moved:')} Chart ${chartId} to ${positionStr}`);
        if (width || height) {
          console.log(`${c.green('Resized:')} ${width || 'unchanged'}x${height || 'unchanged'}`);
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail('Failed to move chart');
      throw error;
    }
  },
};
