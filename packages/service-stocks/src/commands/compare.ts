/**
 * uni stocks compare - Compare multiple stocks
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getQuotes, formatNumber, formatChange } from '../api';

export const compareCommand: Command = {
  name: 'compare',
  aliases: ['cmp', 'vs'],
  description: 'Compare multiple stocks/cryptos side by side',
  args: [
    { name: 'symbols', description: 'Comma-separated symbols (e.g., AAPL,MSFT,GOOGL)', required: true },
  ],
  examples: [
    'uni stocks compare AAPL,MSFT,GOOGL',
    'uni stocks compare BTC-USD,ETH-USD,SOL-USD',
    'uni stocks compare TSLA,F,GM',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    const symbolsArg = args.symbols as string;
    const symbols = symbolsArg.split(',').map((s) => s.trim().toUpperCase());

    if (symbols.length < 2) {
      output.error('Please provide at least 2 symbols to compare');
      return;
    }

    if (symbols.length > 10) {
      output.error('Maximum 10 symbols allowed');
      return;
    }

    const spinner = output.spinner(`Fetching quotes for ${symbols.length} symbols...`);

    try {
      const quotes = await getQuotes(symbols);
      spinner.stop();

      if (globalFlags.json) {
        output.json(quotes);
        return;
      }

      if (quotes.length === 0) {
        output.error('No valid symbols found');
        return;
      }

      output.info('');
      output.info(c.bold('Stock Comparison'));
      output.info('');

      // Find max name length for alignment
      const maxNameLen = Math.min(20, Math.max(...quotes.map((q) => q.name.length)));

      // Header
      output.info(`  ${'Symbol'.padEnd(8)} ${'Name'.padEnd(maxNameLen)} ${'Price'.padEnd(12)} ${'Change'.padEnd(18)} ${'Mkt Cap'.padEnd(10)}`);
      output.info(`  ${'-'.repeat(8)} ${'-'.repeat(maxNameLen)} ${'-'.repeat(12)} ${'-'.repeat(18)} ${'-'.repeat(10)}`);

      // Sort by market cap descending
      const sorted = [...quotes].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

      for (const q of sorted) {
        const name = q.name.length > maxNameLen ? q.name.slice(0, maxNameLen - 1) + '…' : q.name;
        const price = `$${q.price.toFixed(2)}`;
        const change = formatChange(q.change, q.changePercent);
        const changeColor = q.change >= 0 ? c.green : c.red;
        const marketCap = q.marketCap ? formatNumber(q.marketCap) : '-';

        output.info(`  ${q.symbol.padEnd(8)} ${name.padEnd(maxNameLen)} ${price.padEnd(12)} ${changeColor(change.padEnd(18))} ${marketCap}`);
      }

      output.info('');

      // Performance summary
      const best = sorted.reduce((a, b) => (a.changePercent > b.changePercent ? a : b));
      const worst = sorted.reduce((a, b) => (a.changePercent < b.changePercent ? a : b));

      output.info(`  Best performer:  ${c.green(`${best.symbol} (${best.changePercent >= 0 ? '+' : ''}${best.changePercent.toFixed(2)}%)`)}`);
      output.info(`  Worst performer: ${c.red(`${worst.symbol} (${worst.changePercent >= 0 ? '+' : ''}${worst.changePercent.toFixed(2)}%)`)}`);
      output.info('');
    } catch (error) {
      spinner.fail('Failed to fetch quotes');
      throw error;
    }
  },
};
