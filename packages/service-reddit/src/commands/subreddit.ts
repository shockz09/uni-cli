/**
 * uni reddit subreddit - View subreddit info
 */

import type { Command, CommandContext } from '@uni/shared';
import { getSubredditInfo } from '../api';

export const subredditCommand: Command = {
  name: 'subreddit',
  aliases: ['sub', 'info', 'about'],
  description: 'View subreddit information',
  args: [
    { name: 'subreddit', description: 'Subreddit name (without r/)', required: true },
  ],
  examples: [
    'uni reddit subreddit programming',
    'uni reddit subreddit AskReddit',
    'uni reddit sub rust',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    const subreddit = args.subreddit as string;
    const spinner = output.spinner(`Fetching r/${subreddit}...`);

    try {
      const info = await getSubredditInfo(subreddit);
      spinner.stop();

      if (globalFlags.json) {
        output.json(info);
        return;
      }

      const created = new Date(info.created).toLocaleDateString();
      output.info(`r/${info.name}`);
      output.info(`  ${info.title}`);
      output.info(`  Subscribers: ${info.subscribers.toLocaleString()}`);
      if (info.activeUsers > 0) {
        output.info(`  Online: ${info.activeUsers.toLocaleString()}`);
      }
      output.info(`  Created: ${created}`);
      if (info.isNsfw) output.info(`  NSFW: Yes`);
      output.info(`  URL: ${info.url}`);
      if (info.description) {
        output.info(`\nDescription:`);
        output.info(`  ${info.description.slice(0, 300)}${info.description.length > 300 ? '...' : ''}`);
      }
    } catch (error) {
      spinner.fail('Failed to fetch subreddit info');
      throw error;
    }
  },
};
