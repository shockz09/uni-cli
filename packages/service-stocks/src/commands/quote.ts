/**
 * uni stocks <symbol> - Get stock/crypto quote
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getQuote, formatNumber, formatChange } from '../api';

export const quoteCommand: Command = {
  name: '',  // Default command - runs when no subcommand given
  description: 'Get stock/crypto price',
  args: [
    {
      name: 'symbol',
      required: true,
      description: 'Stock/crypto symbol (e.g., AAPL, BTC-USD)',
    },
  ],
  examples: [
    'uni stocks aapl',
    'uni stocks tsla',
    'uni stocks btc-usd',
    'uni stocks eth-usd',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const symbol = args.symbol as string;

    try {
      const quote = await getQuote(symbol);

      if (globalFlags.json) {
        output.json(quote);
        return;
      }

      const isPositive = quote.change >= 0;
      const changeColor = isPositive ? c.green : c.red;

      console.log();
      console.log(`${c.bold(quote.symbol)} ${c.dim(`(${quote.name})`)}`);
      console.log();
      console.log(`  ${c.dim('Price:')}    ${c.bold(`$${quote.price.toFixed(2)}`)}`);
      console.log(`  ${c.dim('Change:')}   ${changeColor(formatChange(quote.change, quote.changePercent))}`);
      console.log(`  ${c.dim('Volume:')}   ${formatNumber(quote.volume)}`);
      console.log();
      console.log(`  ${c.dim('Day:')}      $${quote.dayLow.toFixed(2)} - $${quote.dayHigh.toFixed(2)}`);
      console.log(`  ${c.dim('52 Week:')}  $${quote.fiftyTwoWeekLow.toFixed(2)} - $${quote.fiftyTwoWeekHigh.toFixed(2)}`);
      if (quote.marketCap) {
        console.log(`  ${c.dim('Mkt Cap:')}  $${formatNumber(quote.marketCap)}`);
      }
      console.log();
    } catch (error) {
      output.error(error instanceof Error ? error.message : 'Failed to fetch quote');
    }
  },
};
