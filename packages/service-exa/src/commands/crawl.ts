/**
 * uni exa crawl - Extract content from a URL
 */

import type { Command, CommandContext } from '@uni/shared';
import { ExaClient } from '../api';

export const crawlCommand: Command = {
  name: 'crawl',
  aliases: ['extract', 'fetch', 'contents'],
  description: 'Extract and read content from a URL',
  args: [
    { name: 'url', description: 'URL to extract content from', required: true },
  ],
  options: [
    { name: 'chars', short: 'c', type: 'string', description: 'Max characters to extract (default: 10000)' },
  ],
  examples: [
    'uni exa crawl "https://example.com/article"',
    'uni exa crawl "https://blog.com/post" --chars 5000',
    'uni exa crawl "https://docs.example.com/guide"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    const url = args.url as string;
    const maxCharacters = parseInt((flags.chars as string) || '10000', 10);

    const exa = new ExaClient();
    const spinner = output.spinner('Extracting content...');

    try {
      const result = await exa.crawl(url, maxCharacters);
      spinner.stop();

      if (!result) {
        output.error('Failed to extract content from URL');
        return;
      }

      if (globalFlags.json) {
        output.json(result);
        return;
      }

      output.info(`Title: ${result.title}`);
      output.info(`URL: ${result.url}`);
      if (result.author) {
        output.info(`Author: ${result.author}`);
      }
      if (result.publishedDate) {
        output.info(`Published: ${result.publishedDate}`);
      }
      output.info('\n--- Content ---\n');
      output.info(result.text || 'No text content available');
    } catch (error) {
      spinner.fail('Failed to extract content');
      throw error;
    }
  },
};
