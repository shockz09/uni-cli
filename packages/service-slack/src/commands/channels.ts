/**
 * uni slack channels - Channel commands
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { slack } from '../api';

const listCommand: Command = {
  name: 'list',
  description: 'List channels',
  aliases: ['ls'],
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Maximum number of channels',
      default: 20,
    },
    {
      name: 'private',
      short: 'p',
      type: 'boolean',
      description: 'Include private channels',
      default: true,
    },
  ],
  examples: [
    'uni slack channels list',
    'uni slack channels list --limit 50',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!slack.hasToken()) {
      output.error('Slack token not configured. Set SLACK_BOT_TOKEN environment variable.');
      return;
    }

    const spinner = output.spinner('Fetching channels...');

    try {
      const types = flags.private
        ? 'public_channel,private_channel'
        : 'public_channel';

      const channels = await slack.listChannels({
        limit: flags.limit as number,
        types,
      });

      spinner.success(`Found ${channels.length} channels`);

      if (globalFlags.json) {
        output.json(channels);
        return;
      }

      console.log('');
      for (const channel of channels) {
        const prefix = channel.is_private ? '🔒' : '#';
        const members = channel.num_members ? ` (${channel.num_members} members)` : '';
        console.log(`${prefix} ${c.bold(channel.name)}${members}`);
        if (channel.purpose?.value) {
          console.log(`   ${c.dim(channel.purpose.value.slice(0, 80))}`);
        }
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch channels');
      throw error;
    }
  },
};

const infoCommand: Command = {
  name: 'info',
  description: 'Get channel info',
  args: [
    {
      name: 'channel',
      description: 'Channel name or ID',
      required: true,
    },
  ],
  examples: [
    'uni slack channels info general',
    'uni slack channels info C01234567',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!slack.hasToken()) {
      output.error('Slack token not configured.');
      return;
    }

    const channelId = args.channel;
    const spinner = output.spinner(`Fetching channel info...`);

    try {
      const channel = await slack.getChannel(channelId);
      spinner.success(`#${channel.name}`);

      if (globalFlags.json) {
        output.json(channel);
        return;
      }

      const prefix = channel.is_private ? '🔒' : '#';
      console.log('');
      console.log(`${prefix} ${c.bold(channel.name)}`);
      console.log(`   ID: ${channel.id}`);
      if (channel.topic?.value) {
        console.log(`   Topic: ${channel.topic.value}`);
      }
      if (channel.purpose?.value) {
        console.log(`   Purpose: ${channel.purpose.value}`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch channel');
      throw error;
    }
  },
};

export const channelsCommand: Command = {
  name: 'channels',
  description: 'Manage channels',
  aliases: ['ch', 'channel'],
  subcommands: [listCommand, infoCommand],
  examples: [
    'uni slack channels list',
    'uni slack channels info general',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    await listCommand.handler(ctx);
  },
};
