/**
 * uni arxiv categories - List arXiv categories
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { CATEGORIES } from '../api';

export const categoriesCommand: Command = {
  name: 'categories',
  aliases: ['cats', 'cat'],
  description: 'List arXiv categories',
  options: [
    { name: 'filter', short: 'f', type: 'string', description: 'Filter by prefix (cs, stat, math, etc.)' },
  ],
  examples: [
    'uni arxiv categories',
    'uni arxiv categories --filter cs',
    'uni arxiv categories -f stat',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;
    const filter = (flags.filter as string)?.toLowerCase();

    let categories = Object.entries(CATEGORIES);

    if (filter) {
      categories = categories.filter(([code]) => code.toLowerCase().startsWith(filter));
    }

    if (globalFlags.json) {
      output.json(categories.map(([code, name]) => ({ code, name })));
      return;
    }

    if (categories.length === 0) {
      output.info(`No categories found matching "${filter}"`);
      return;
    }

    output.info('');
    output.info(c.bold(`arXiv Categories${filter ? ` (${filter}*)` : ''}`));
    output.info('');

    // Group by prefix
    const grouped: Record<string, [string, string][]> = {};
    for (const [code, name] of categories) {
      const prefix = code.split('.')[0];
      if (!grouped[prefix]) grouped[prefix] = [];
      grouped[prefix].push([code, name]);
    }

    for (const [prefix, cats] of Object.entries(grouped)) {
      output.info(c.bold(`  ${prefix.toUpperCase()}`));
      for (const [code, name] of cats) {
        output.info(`    ${c.cyan(code.padEnd(18))} ${name}`);
      }
      output.info('');
    }

    output.info(c.dim('  Use: uni arxiv recent <category> to see recent papers'));
    output.info('');
  },
};
