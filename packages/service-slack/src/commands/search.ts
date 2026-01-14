/**
 * uni slack search - Search messages
 */

import type { Command, CommandContext } from '@uni/shared';
import { slack } from '../api';

export const searchCommand: Command = {
  name: 'search',
  aliases: ['find', 'query'],
  description: 'Search messages (requires user token)',
  args: [
    { name: 'query', description: 'Search query', required: true },
  ],
  options: [
    { name: 'limit', short: 'n', type: 'string', description: 'Number of results (default: 20)' },
  ],
  examples: [
    'uni slack search "deployment"',
    'uni slack search "from:@john bug" --limit 50',
    'uni slack search "in:#general meeting"',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!slack.hasToken()) {
      output.error('SLACK_BOT_TOKEN not set');
      return;
    }

    const query = args.query as string;
    const count = parseInt((flags.limit as string) || '20', 10);

    const spinner = output.spinner('Searching messages...');
    try {
      const result = await slack.searchMessages(query, { count });
      spinner.stop();

      if (globalFlags.json) {
        output.json(result);
        return;
      }

      if (result.messages.length === 0) {
        output.info('No messages found.');
        return;
      }

      output.info(`Found ${result.total} messages (showing ${result.messages.length}):\n`);
      for (const msg of result.messages) {
        const time = new Date(parseFloat(msg.ts) * 1000).toLocaleString();
        const preview = msg.text.length > 80 ? msg.text.slice(0, 80) + '...' : msg.text;
        output.info(`  [${time}] ${msg.user || 'unknown'}: ${preview}`);
      }
    } catch (error) {
      spinner.fail('Failed to search (note: requires user token, not bot token)');
      throw error;
    }
  },
};
