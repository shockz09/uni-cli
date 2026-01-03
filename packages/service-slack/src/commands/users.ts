/**
 * uni slack users - User commands
 */

import type { Command, CommandContext } from '@uni/shared';
import { slack } from '../api';

const listCommand: Command = {
  name: 'list',
  description: 'List users',
  aliases: ['ls'],
  options: [
    {
      name: 'limit',
      short: 'l',
      type: 'number',
      description: 'Maximum number of users',
      default: 50,
    },
  ],
  examples: [
    'uni slack users list',
    'uni slack users list --limit 100',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, flags, globalFlags } = ctx;

    if (!slack.hasToken()) {
      output.error('Slack token not configured.');
      return;
    }

    const spinner = output.spinner('Fetching users...');

    try {
      const users = await slack.listUsers({ limit: flags.limit as number });
      const realUsers = users.filter(u => !u.is_bot);

      spinner.success(`Found ${realUsers.length} users`);

      if (globalFlags.json) {
        output.json(realUsers);
        return;
      }

      console.log('');
      for (const user of realUsers) {
        const displayName = user.profile.display_name || user.real_name || user.name;
        const email = user.profile.email ? ` \x1b[90m<${user.profile.email}>\x1b[0m` : '';
        console.log(`\x1b[1m${displayName}\x1b[0m (@${user.name})${email}`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch users');
      throw error;
    }
  },
};

const infoCommand: Command = {
  name: 'info',
  description: 'Get user info',
  args: [
    {
      name: 'user',
      description: 'User ID',
      required: true,
    },
  ],
  examples: [
    'uni slack users info U01234567',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!slack.hasToken()) {
      output.error('Slack token not configured.');
      return;
    }

    const userId = args.user;
    const spinner = output.spinner('Fetching user...');

    try {
      const user = await slack.getUser(userId);
      spinner.success(user.real_name);

      if (globalFlags.json) {
        output.json(user);
        return;
      }

      console.log('');
      console.log(`\x1b[1m${user.real_name}\x1b[0m (@${user.name})`);
      console.log(`ID: ${user.id}`);
      if (user.profile.email) {
        console.log(`Email: ${user.profile.email}`);
      }
      if (user.profile.display_name) {
        console.log(`Display: ${user.profile.display_name}`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch user');
      throw error;
    }
  },
};

export const usersCommand: Command = {
  name: 'users',
  description: 'Manage users',
  aliases: ['user', 'u'],
  subcommands: [listCommand, infoCommand],
  examples: [
    'uni slack users list',
    'uni slack users info U01234567',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    await listCommand.handler(ctx);
  },
};
