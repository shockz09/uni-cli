/**
 * uni stocks history <symbol> - Get price history
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getHistory } from '../api';

export const historyCommand: Command = {
  name: 'history',
  description: 'Get price history',
  args: [
    {
      name: 'symbol',
      required: true,
      description: 'Stock/crypto symbol',
    },
  ],
  options: [
    {
      name: 'period',
      short: 'p',
      type: 'string',
      description: 'Time period (1d, 5d, 1w, 1mo, 3mo, 6mo, 1y, 5y)',
      default: '1mo',
    },
  ],
  examples: [
    'uni stocks history aapl',
    'uni stocks history btc-usd --period 1w',
    'uni stocks history tsla -p 1y',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, flags, output, globalFlags } = ctx;

    const symbol = args.symbol as string;
    const period = flags.period as string;

    try {
      const history = await getHistory(symbol, period);

      if (globalFlags.json) {
        output.json(history);
        return;
      }

      console.log();
      console.log(`${c.bold(symbol.toUpperCase())} - ${period} history`);
      console.log();

      // Show table header
      console.log(
        c.dim('  DATE         OPEN       HIGH        LOW      CLOSE      VOLUME')
      );
      console.log(c.dim('  ' + '─'.repeat(65)));

      // Show last 10 entries (or all if less)
      const entries = history.slice(-10);

      for (const entry of entries) {
        const date = entry.date.toISOString().split('T')[0];
        const open = entry.open.toFixed(2).padStart(8);
        const high = entry.high.toFixed(2).padStart(8);
        const low = entry.low.toFixed(2).padStart(8);
        const close = entry.close.toFixed(2).padStart(8);
        const vol = formatVolume(entry.volume).padStart(10);

        console.log(`  ${date}  $${open}  $${high}  $${low}  $${close}  ${vol}`);
      }

      if (history.length > 10) {
        console.log(c.dim(`  ... and ${history.length - 10} more entries`));
      }

      console.log();

      // Summary
      const first = history[0];
      const last = history[history.length - 1];
      const change = last.close - first.close;
      const changePercent = (change / first.close) * 100;
      const changeColor = change >= 0 ? c.green : c.red;

      console.log(
        `  ${c.dim('Period change:')} ${changeColor(
          `${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`
        )}`
      );
      console.log();
    } catch (error) {
      output.error(error instanceof Error ? error.message : 'Failed to fetch history');
    }
  },
};

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toString();
}
