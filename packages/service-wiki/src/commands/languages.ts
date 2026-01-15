/**
 * uni wiki languages - Get article in other languages
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { getLanguages } from '../api';

export const languagesCommand: Command = {
  name: 'languages',
  aliases: ['lang', 'l'],
  description: 'Get Wikipedia article in other languages',
  args: [
    { name: 'title', description: 'Article title (English)', required: true },
  ],
  options: [
    { name: 'filter', short: 'f', type: 'string', description: 'Filter by language code (e.g., es, de, fr)' },
  ],
  examples: [
    'uni wiki languages "Albert Einstein"',
    'uni wiki languages Python --filter es',
    'uni wiki languages Tokyo',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const title = args.title as string;
    const filter = flags.filter as string | undefined;

    const spinner = output.spinner(`Finding translations for "${title}"...`);

    try {
      let languages = await getLanguages(title);
      spinner.stop();

      if (filter) {
        languages = languages.filter((l) => l.lang.toLowerCase().includes(filter.toLowerCase()));
      }

      if (globalFlags.json) {
        output.json(languages);
        return;
      }

      if (languages.length === 0) {
        output.info(`No translations found for "${title}"${filter ? ` matching "${filter}"` : ''}`);
        return;
      }

      output.info('');
      output.info(c.bold(`"${title}" in other languages (${languages.length} available)`));
      output.info('');

      // Group by first letter of language code
      const sorted = [...languages].sort((a, b) => a.lang.localeCompare(b.lang));

      // Common languages to highlight
      const common = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'ru', 'zh', 'ar', 'hi'];
      const highlighted = sorted.filter((l) => common.includes(l.lang));
      const others = sorted.filter((l) => !common.includes(l.lang));

      if (highlighted.length > 0) {
        output.info(c.bold('  Common Languages:'));
        for (const lang of highlighted) {
          output.info(`    ${c.cyan(lang.lang.padEnd(6))} ${lang.title}`);
          output.info(`      ${c.dim(lang.url)}`);
        }
        output.info('');
      }

      if (others.length > 0 && !filter) {
        output.info(c.dim(`  + ${others.length} more languages. Use --filter to search.`));
        output.info('');
      } else if (others.length > 0) {
        output.info(c.bold('  Other Languages:'));
        for (const lang of others.slice(0, 20)) {
          output.info(`    ${c.cyan(lang.lang.padEnd(6))} ${lang.title}`);
        }
        if (others.length > 20) {
          output.info(c.dim(`    ... and ${others.length - 20} more`));
        }
        output.info('');
      }
    } catch (error) {
      spinner.fail('Failed to find translations');
      throw error;
    }
  },
};
