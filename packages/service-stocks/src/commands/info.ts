/**
 * uni stocks <symbol> --info - Get detailed stock info
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getInfo, formatNumber } from '../api';

export const infoCommand: Command = {
  name: 'info',
  description: 'Get detailed stock/crypto info',
  args: [
    {
      name: 'symbol',
      required: true,
      description: 'Stock/crypto symbol',
    },
  ],
  examples: [
    'uni stocks info aapl',
    'uni stocks info msft',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { args, output, globalFlags } = ctx;

    const symbol = args.symbol as string;

    try {
      const info = await getInfo(symbol);

      if (globalFlags.json) {
        output.json(info);
        return;
      }

      console.log();
      console.log(`${c.bold(info.symbol)} - ${info.name}`);
      console.log();

      if (info.sector) {
        console.log(`  ${c.dim('Sector:')}      ${info.sector}`);
      }
      if (info.industry) {
        console.log(`  ${c.dim('Industry:')}    ${info.industry}`);
      }
      if (info.marketCap) {
        console.log(`  ${c.dim('Market Cap:')}  $${formatNumber(info.marketCap)}`);
      }
      if (info.peRatio) {
        console.log(`  ${c.dim('P/E Ratio:')}   ${info.peRatio.toFixed(2)}`);
      }
      if (info.dividendYield) {
        console.log(`  ${c.dim('Dividend:')}    ${(info.dividendYield * 100).toFixed(2)}%`);
      }
      console.log();
      console.log(`  ${c.dim('52W High:')}    $${info.fiftyTwoWeekHigh.toFixed(2)}`);
      console.log(`  ${c.dim('52W Low:')}     $${info.fiftyTwoWeekLow.toFixed(2)}`);
      if (info.avgVolume) {
        console.log(`  ${c.dim('Avg Volume:')}  ${formatNumber(info.avgVolume)}`);
      }
      console.log();

      if (info.description) {
        // Truncate description to first 200 chars
        const desc = info.description.length > 200
          ? info.description.slice(0, 200) + '...'
          : info.description;
        console.log(c.dim(desc));
        console.log();
      }
    } catch (error) {
      output.error(error instanceof Error ? error.message : 'Failed to fetch info');
    }
  },
};
