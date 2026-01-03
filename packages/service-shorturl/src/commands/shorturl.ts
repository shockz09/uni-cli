/**
 * uni shorturl - Shorten URLs
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { shorten, expand, isShortUrl } from '../api';

export const shorturlCommand: Command = {
  name: '',  // Default command - runs when no subcommand given
  description: 'Shorten or expand URLs',
  args: [
    {
      name: 'url',
      description: 'URL to shorten or expand',
      required: false,
    },
  ],
  options: [
    {
      name: 'expand',
      short: 'e',
      type: 'boolean',
      description: 'Expand a short URL to original',
    },
  ],
  examples: [
    'uni shorturl "https://example.com/very/long/path"',
    'uni shorturl "https://is.gd/abc123" --expand',
    'uni short "https://example.com"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const url = args.url as string | undefined;
    const shouldExpand = flags.expand as boolean;

    if (!url) {
      output.error('URL required. Example: uni shorturl "https://example.com"');
      return;
    }

    const spinner = output.spinner(shouldExpand ? 'Expanding URL...' : 'Shortening URL...');

    try {
      if (shouldExpand) {
        const original = await expand(url);

        spinner.success('URL expanded');

        if (globalFlags.json) {
          output.json({
            short: url,
            original,
          });
          return;
        }

        console.log('');
        console.log(`  ${c.dim('Short:')}    ${url}`);
        console.log(`  ${c.bold('Original:')} ${original}`);
        console.log('');
      } else {
        // Check if already a short URL
        if (isShortUrl(url)) {
          spinner.warn('URL appears to already be shortened');
        }

        const result = await shorten(url);

        spinner.success('URL shortened');

        if (globalFlags.json) {
          output.json(result);
          return;
        }

        console.log('');
        console.log(`  ${c.dim('Original:')} ${result.original}`);
        console.log(`  ${c.green(c.bold('Short:'))}    ${result.short}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail(shouldExpand ? 'Failed to expand URL' : 'Failed to shorten URL');
      throw error;
    }
  },
};
