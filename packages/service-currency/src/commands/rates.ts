/**
 * uni currency rates - Show all exchange rates for a currency
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getLatestRates, CURRENCY_NAMES, formatCurrency } from '../api';

export const ratesCommand: Command = {
  name: 'rates',
  aliases: ['r', 'all'],
  description: 'Show all exchange rates for a currency',
  args: [
    { name: 'base', description: 'Base currency code (default: USD)', required: false },
  ],
  examples: [
    'uni currency rates',
    'uni currency rates USD',
    'uni currency rates EUR',
    'uni currency rates GBP',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    const base = (args.base as string || 'USD').toUpperCase();

    const spinner = output.spinner(`Fetching exchange rates for ${base}...`);

    try {
      const data = await getLatestRates(base);
      spinner.stop();

      if (globalFlags.json) {
        output.json(data);
        return;
      }

      output.info('');
      output.info(c.bold(`Exchange Rates - 1 ${base} (${CURRENCY_NAMES[base] || base})`));
      output.info(c.dim(`As of ${data.date}`));
      output.info('');

      // Sort by currency code
      const sorted = Object.entries(data.rates).sort((a, b) => a[0].localeCompare(b[0]));

      // Display in 2 columns
      const perColumn = Math.ceil(sorted.length / 2);
      for (let i = 0; i < perColumn; i++) {
        const cols = [];
        for (let j = 0; j < 2; j++) {
          const idx = i + j * perColumn;
          if (idx < sorted.length) {
            const [code, rate] = sorted[idx];
            const formatted = formatCurrency(rate, code);
            cols.push(`  ${c.bold(code)} ${formatted.padStart(14)} ${(CURRENCY_NAMES[code] || '').padEnd(22)}`);
          }
        }
        output.info(cols.join(''));
      }

      output.info('');
    } catch (error) {
      spinner.fail('Failed to fetch rates');
      throw error;
    }
  },
};
