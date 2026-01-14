/**
 * uni gmail threads - List and view email threads
 */

import type { Command, CommandContext } from '@uni/shared';
import { gmail } from '../api';

export const threadsCommand: Command = {
  name: 'threads',
  aliases: ['thread'],
  description: 'List and view email threads',
  args: [
    { name: 'threadId', description: 'Thread ID to view (optional)', required: false },
  ],
  options: [
    { name: 'query', short: 'q', type: 'string', description: 'Search query' },
    { name: 'limit', short: 'n', type: 'string', description: 'Number of threads (default: 20)' },
  ],
  examples: [
    'uni gmail threads',
    'uni gmail threads --query "from:boss@company.com"',
    'uni gmail threads THREAD_ID',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gmail.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gmail auth" first.');
      return;
    }

    // View specific thread
    if (args.threadId) {
      const spinner = output.spinner('Fetching thread...');
      try {
        const thread = await gmail.getThread(args.threadId as string);
        spinner.stop();

        if (globalFlags.json) {
          output.json(thread);
          return;
        }

        output.log(`Thread: ${thread.id}\n`);
        output.log(`Messages: ${thread.messages.length}\n`);

        for (let i = 0; i < thread.messages.length; i++) {
          const msg = thread.messages[i];
          const from = gmail.getHeader(msg, 'From') || 'Unknown';
          const subject = gmail.getHeader(msg, 'Subject') || 'No Subject';
          const date = gmail.getHeader(msg, 'Date') || '';

          output.log(`--- Message ${i + 1} ---`);
          output.log(`From: ${from}`);
          output.log(`Subject: ${subject}`);
          output.log(`Date: ${date}`);
          output.log(`\n${gmail.decodeBody(msg)}\n`);
        }
        return;
      } catch (error) {
        spinner.fail('Failed to fetch thread');
        throw error;
      }
    }

    // List threads
    const limit = parseInt((flags.limit as string) || '20', 10);
    const spinner = output.spinner('Fetching threads...');
    try {
      const threads = await gmail.listThreads({
        maxResults: limit,
        q: flags.query as string | undefined,
      });
      spinner.stop();

      if (globalFlags.json) {
        output.json(threads);
        return;
      }

      if (threads.length === 0) {
        output.log('No threads found.');
        return;
      }

      output.log(`Found ${threads.length} thread(s):\n`);
      for (const thread of threads) {
        output.log(`  ${thread.id}`);
        output.log(`    ${thread.snippet.slice(0, 80)}...`);
        output.log('');
      }
    } catch (error) {
      spinner.fail('Failed to fetch threads');
      throw error;
    }
  },
};
