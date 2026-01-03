/**
 * uni gtasks lists - Manage task lists
 */

import type { Command, CommandContext } from '@uni/shared';
import { gtasks } from '../api';

const listSubcommand: Command = {
  name: 'list',
  description: 'List all task lists',
  aliases: ['ls'],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const spinner = output.spinner('Fetching lists...');

    try {
      const lists = await gtasks.getTaskLists();
      spinner.success(`Found ${lists.length} list(s)`);

      if (globalFlags.json) {
        output.json(lists);
        return;
      }

      console.log('');
      for (const list of lists) {
        console.log(`  \x1b[1m${list.title}\x1b[0m`);
        console.log(`    \x1b[90mID: ${list.id}\x1b[0m`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch lists');
      throw error;
    }
  },
};

const addSubcommand: Command = {
  name: 'add',
  description: 'Create a new task list',
  aliases: ['create', 'new'],
  args: [
    {
      name: 'name',
      description: 'List name',
      required: true,
    },
  ],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const name = args.name as string;
    const spinner = output.spinner(`Creating list "${name}"...`);

    try {
      const list = await gtasks.createTaskList(name);
      spinner.success('List created');

      if (globalFlags.json) {
        output.json(list);
        return;
      }

      console.log('');
      console.log(`  \x1b[1m${list.title}\x1b[0m`);
      console.log(`    \x1b[90mID: ${list.id}\x1b[0m`);
      console.log('');
    } catch (error) {
      spinner.fail('Failed to create list');
      throw error;
    }
  },
};

const deleteSubcommand: Command = {
  name: 'delete',
  description: 'Delete a task list',
  aliases: ['rm', 'remove'],
  args: [
    {
      name: 'id',
      description: 'List ID',
      required: true,
    },
  ],
  options: [
    {
      name: 'force',
      short: 'f',
      type: 'boolean',
      description: 'Skip confirmation',
      default: false,
    },
  ],
  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;

    if (!gtasks.isAuthenticated()) {
      output.error('Not authenticated. Run "uni gtasks auth" first.');
      return;
    }

    const listId = args.id as string;

    if (!flags.force) {
      const readline = await import('node:readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question(`\x1b[33mDelete list "${listId}"? [y/N] \x1b[0m`, resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        output.info('Cancelled');
        return;
      }
    }

    const spinner = output.spinner('Deleting list...');

    try {
      await gtasks.deleteTaskList(listId);
      spinner.success('List deleted');

      if (globalFlags.json) {
        output.json({ deleted: listId });
      }
    } catch (error) {
      spinner.fail('Failed to delete list');
      throw error;
    }
  },
};

export const listsCommand: Command = {
  name: 'lists',
  description: 'Manage task lists',
  subcommands: [listSubcommand, addSubcommand, deleteSubcommand],
  examples: [
    'uni gtasks lists',
    'uni gtasks lists add "Work"',
    'uni gtasks lists delete <list-id>',
  ],

  // Default: list all lists
  async handler(ctx: CommandContext): Promise<void> {
    return listSubcommand.handler(ctx);
  },
};
