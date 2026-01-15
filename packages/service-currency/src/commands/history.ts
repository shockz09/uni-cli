/**
 * uni currency history - Show historical exchange rates
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getHistoricalRates, CURRENCY_NAMES, formatCurrency } from '../api';

export const historyCommand: Command = {
  name: 'history',
  aliases: ['hist', 'h'],
  description: 'Show historical exchange rates between two currencies',
  args: [
    { name: 'from', description: 'Base currency code', required: true },
    { name: 'to', description: 'Target currency code', required: true },
  ],
  options: [
    { name: 'days', short: 'd', type: 'number', description: 'Number of days (default: 30, max: 365)' },
  ],
  examples: [
    'uni currency history USD EUR',
    'uni currency history USD JPY --days 90',
    'uni currency history GBP USD -d 7',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const from = (args.from as string).toUpperCase();
    const to = (args.to as string).toUpperCase();
    const days = Math.min((flags.days as number) || 30, 365);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const spinner = output.spinner(`Fetching ${from}/${to} history...`);

    try {
      const rates = await getHistoricalRates(from, to, startStr, endStr);
      spinner.stop();

      if (globalFlags.json) {
        output.json({ from, to, rates });
        return;
      }

      if (rates.length === 0) {
        output.error('No historical data available');
        return;
      }

      output.info('');
      output.info(c.bold(`${from}/${to} Exchange Rate History`));
      output.info(c.dim(`${CURRENCY_NAMES[from] || from} to ${CURRENCY_NAMES[to] || to}`));
      output.info('');

      // Calculate stats
      const rateValues = rates.map(r => r.rate);
      const min = Math.min(...rateValues);
      const max = Math.max(...rateValues);
      const avg = rateValues.reduce((a, b) => a + b, 0) / rateValues.length;
      const first = rateValues[0];
      const last = rateValues[rateValues.length - 1];
      const change = ((last - first) / first) * 100;

      // Show summary
      const changeColor = change >= 0 ? c.green : c.red;
      output.info(`  Current:  ${c.bold(formatCurrency(last, to))} ${to}`);
      output.info(`  Change:   ${changeColor(`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`)}`);
      output.info(`  High:     ${formatCurrency(max, to)} ${to}`);
      output.info(`  Low:      ${formatCurrency(min, to)} ${to}`);
      output.info(`  Average:  ${formatCurrency(avg, to)} ${to}`);
      output.info('');

      // Show sparkline-style chart (simplified)
      output.info(c.bold('  Recent rates:'));
      const recent = rates.slice(-10);
      for (const r of recent) {
        const bar = '█'.repeat(Math.round(((r.rate - min) / (max - min)) * 20) || 1);
        const dateShort = r.date.slice(5); // MM-DD
        output.info(`    ${dateShort} ${formatCurrency(r.rate, to).padStart(12)} ${c.cyan(bar)}`);
      }

      output.info('');
    } catch (error) {
      spinner.fail('Failed to fetch history');
      throw error;
    }
  },
};
