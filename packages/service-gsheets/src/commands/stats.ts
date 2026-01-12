/**
 * uni gsheets stats - Calculate statistics for a range
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { gsheets, extractSpreadsheetId } from '../api';

export const statsCommand: Command = {
  name: 'stats',
  description: 'Calculate statistics (sum, avg, min, max, count) for a range',
  args: [
    { name: 'id', description: 'Spreadsheet ID or URL', required: true },
    { name: 'range', description: 'Range to analyze (e.g., B2:B100)', required: true },
  ],
  options: [
    { name: 'sheet', short: 's', type: 'string', description: 'Sheet name (default: first sheet)' },
  ],
  examples: [
    'uni gsheets stats ID B2:B100',
    'uni gsheets stats ID C1:C500 --sheet "Sales"',
    'uni gsheets stats ID "Revenue!D2:D1000"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gsheets.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gsheets auth" first.');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(args.id as string);
    let rangeStr = args.range as string;
    const sheetName = flags.sheet as string | undefined;

    const spinner = output.spinner('Calculating statistics...');

    try {
      // Get spreadsheet info
      const spreadsheet = await gsheets.getSpreadsheet(spreadsheetId);
      const sheets = [...(spreadsheet.sheets || [])].sort((a, b) => {
        const indexA = a.properties.index ?? (a.properties.sheetId === 0 ? 0 : 999);
        const indexB = b.properties.index ?? (b.properties.sheetId === 0 ? 0 : 999);
        return indexA - indexB;
      });

      const targetSheet = sheetName
        ? sheets.find(s => s.properties.title.toLowerCase() === sheetName.toLowerCase())
        : sheets[0];

      if (!targetSheet) {
        spinner.fail(sheetName ? `Sheet "${sheetName}" not found` : 'No sheets in spreadsheet');
        return;
      }

      // Prepend sheet name if not included
      if (!rangeStr.includes('!')) {
        rangeStr = `${targetSheet.properties.title}!${rangeStr}`;
      }

      // Get data
      const values = await gsheets.getValues(spreadsheetId, rangeStr);

      if (values.length === 0) {
        spinner.fail('No data in range');
        return;
      }

      // Extract numbers from all cells
      const numbers: number[] = [];
      for (const row of values) {
        for (const cell of row) {
          const num = parseFloat(cell);
          if (!isNaN(num)) {
            numbers.push(num);
          }
        }
      }

      if (numbers.length === 0) {
        spinner.fail('No numeric values found in range');
        return;
      }

      // Calculate statistics
      const sum = numbers.reduce((a, b) => a + b, 0);
      const avg = sum / numbers.length;
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);
      const count = numbers.length;

      // Calculate median
      const sorted = [...numbers].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

      // Calculate standard deviation
      const variance = numbers.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / numbers.length;
      const stdDev = Math.sqrt(variance);

      spinner.stop();

      const stats = {
        count,
        sum: Math.round(sum * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        median: Math.round(median * 100) / 100,
        min,
        max,
        stdDev: Math.round(stdDev * 100) / 100,
        range: rangeStr,
      };

      output.pipe(`sum=${stats.sum} avg=${stats.avg} min=${stats.min} max=${stats.max}`);

      if (globalFlags.json) {
        output.json(stats);
        return;
      }

      console.log('');
      console.log(c.bold(`Statistics for ${rangeStr}:`));
      console.log('');
      console.log(`  ${c.cyan('Count:')}   ${count}`);
      console.log(`  ${c.cyan('Sum:')}     ${stats.sum}`);
      console.log(`  ${c.cyan('Average:')} ${stats.avg}`);
      console.log(`  ${c.cyan('Median:')}  ${stats.median}`);
      console.log(`  ${c.cyan('Min:')}     ${min}`);
      console.log(`  ${c.cyan('Max:')}     ${max}`);
      console.log(`  ${c.cyan('Std Dev:')} ${stats.stdDev}`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to calculate statistics');
      throw error;
    }
  },
};
