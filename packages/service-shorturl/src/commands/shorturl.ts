/**
 * uni shorturl - Shorten URLs
 */

import type { Command, CommandContext } from '@uni/shared';
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
        console.log(`  \x1b[90mShort:\x1b[0m    ${url}`);
        console.log(`  \x1b[1mOriginal:\x1b[0m ${original}`);
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
        console.log(`  \x1b[90mOriginal:\x1b[0m ${result.original}`);
        console.log(`  \x1b[32m\x1b[1mShort:\x1b[0m    ${result.short}`);
        console.log('');
      }
    } catch (error) {
      spinner.fail(shouldExpand ? 'Failed to expand URL' : 'Failed to shorten URL');
      throw error;
    }
  },
};
