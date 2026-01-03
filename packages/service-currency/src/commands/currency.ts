/**
 * uni currency - Convert currencies
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { convert, SUPPORTED_CURRENCIES, CURRENCY_NAMES, formatCurrency } from '../api';

export const currencyCommand: Command = {
  name: '',  // Default command - runs when no subcommand given
  description: 'Convert currencies',
  args: [
    {
      name: 'amount',
      description: 'Amount to convert',
      required: false,
    },
    {
      name: 'from',
      description: 'Source currency code (USD, EUR, etc.)',
      required: false,
    },
    {
      name: 'to',
      description: '"to" keyword (optional)',
      required: false,
    },
    {
      name: 'target',
      description: 'Target currency code(s)',
      required: false,
    },
  ],
  options: [
    {
      name: 'list',
      short: 'l',
      type: 'boolean',
      description: 'List all supported currencies',
    },
  ],
  examples: [
    'uni currency 100 usd to eur',
    'uni currency 100 usd eur',
    'uni currency 5000 jpy to usd',
    'uni currency 1000 eur to usd gbp jpy',
    'uni currency --list',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    // Handle --list flag
    if (flags.list) {
      if (globalFlags.json) {
        output.json({
          currencies: SUPPORTED_CURRENCIES.map(code => ({
            code,
            name: CURRENCY_NAMES[code],
          })),
        });
        return;
      }

      console.log('');
      console.log(c.bold('Supported Currencies:'));
      console.log('');

      // Display in 3 columns
      const perColumn = Math.ceil(SUPPORTED_CURRENCIES.length / 3);
      for (let i = 0; i < perColumn; i++) {
        const cols = [];
        for (let j = 0; j < 3; j++) {
          const idx = i + j * perColumn;
          if (idx < SUPPORTED_CURRENCIES.length) {
            const code = SUPPORTED_CURRENCIES[idx];
            cols.push(`  ${c.bold(code)} ${CURRENCY_NAMES[code].padEnd(20)}`);
          }
        }
        console.log(cols.join(''));
      }
      console.log('');
      return;
    }

    // Parse arguments: "100 usd to eur" or "100 usd eur"
    const rawArgs = ctx.rawArgs || [];
    let amount: number | undefined;
    let from: string | undefined;
    let targets: string[] = [];

    // Try to parse from positional args
    if (args.amount !== undefined) {
      amount = parseFloat(String(args.amount));
      if (isNaN(amount)) {
        output.error(`Invalid amount: ${args.amount}`);
        return;
      }
    }

    if (args.from) {
      from = String(args.from).toUpperCase();
    }

    // Collect target currencies (skip "to" keyword)
    if (args.to && String(args.to).toLowerCase() !== 'to') {
      targets.push(String(args.to).toUpperCase());
    }
    if (args.target) {
      targets.push(String(args.target).toUpperCase());
    }

    // Also check remaining raw args for additional targets
    // This handles: uni currency 100 usd to eur gbp jpy
    let foundTo = false;
    for (const arg of rawArgs) {
      if (arg.toLowerCase() === 'to') {
        foundTo = true;
        continue;
      }
      if (foundTo && /^[a-zA-Z]{3}$/.test(arg)) {
        const code = arg.toUpperCase();
        if (!targets.includes(code) && code !== from) {
          targets.push(code);
        }
      }
    }

    if (!amount || !from || targets.length === 0) {
      output.error('Usage: uni currency <amount> <from> to <to>');
      output.info('Example: uni currency 100 usd to eur');
      output.info('Use --list to see supported currencies');
      return;
    }

    const spinner = output.spinner(`Converting ${amount} ${from}...`);

    try {
      const results = await convert(amount, from, targets);

      spinner.success('Conversion complete');

      if (globalFlags.json) {
        output.json({
          amount,
          from,
          conversions: results.map(r => ({
            to: r.to,
            result: r.result,
            rate: r.rate,
          })),
          date: results[0]?.date,
        });
        return;
      }

      console.log('');
      for (const result of results) {
        const formatted = formatCurrency(result.result, result.to);
        console.log(`  ${c.bold(`${formatCurrency(amount, from)} ${from}`)} = ${c.green(`${formatted} ${result.to}`)}`);
        console.log(`  ${c.dim(`Rate: 1 ${from} = ${result.rate.toFixed(4)} ${result.to}`)}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail('Conversion failed');
      throw error;
    }
  },
};
