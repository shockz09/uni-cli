/**
 * uni stocks list - List popular symbols
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getQuote, formatNumber, POPULAR } from '../api';

export const listCommand: Command = {
  name: 'list',
  description: 'List popular symbols with prices',
  args: [
    {
      name: 'type',
      required: false,
      description: 'Type: stocks, crypto, or indices (default: stocks)',
    },
  ],
  examples: [
    'uni stocks list',
    'uni stocks list crypto',
    'uni stocks list indices',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const type = (args.type as string)?.toLowerCase() || 'stocks';

    const symbols = POPULAR[type as keyof typeof POPULAR];
    if (!symbols) {
      output.error(`Unknown type: ${type}. Use: stocks, crypto, or indices`);
      return;
    }

    console.log();
    console.log(c.bold(`Popular ${type.charAt(0).toUpperCase() + type.slice(1)}`));
    console.log();

    const results: Array<{
      symbol: string;
      name: string;
      price: number;
      change: number;
      changePercent: number;
    }> = [];

    for (const symbol of symbols) {
      try {
        const quote = await getQuote(symbol);
        results.push({
          symbol: quote.symbol,
          name: quote.name,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
        });
      } catch {
        // Skip failed symbols
      }
    }

    if (globalFlags.json) {
      output.json(results);
      return;
    }

    for (const r of results) {
      const changeColor = r.change >= 0 ? c.green : c.red;
      const sign = r.change >= 0 ? '+' : '';

      console.log(
        `  ${c.bold(r.symbol.padEnd(10))} $${r.price.toFixed(2).padStart(10)}  ${changeColor(
          `${sign}${r.changePercent.toFixed(2)}%`.padStart(8)
        )}  ${c.dim(r.name.slice(0, 25))}`
      );
    }

    console.log();
  },
};
