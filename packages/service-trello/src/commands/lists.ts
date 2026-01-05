/**
 * uni trello lists - Manage Trello lists
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { trello } from '../api';

export const listsCommand: Command = {
  name: 'lists',
  aliases: ['list', 'l'],
  description: 'Manage lists in a board',
  subcommands: [
    {
      name: 'list',
      aliases: ['ls'],
      description: 'List lists in a board',
      args: [{ name: 'board', description: 'Board name or ID', required: true }],
      examples: ['uni trello lists list "My Project"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const boardName = args.board as string;

        if (!trello.hasCredentials()) {
          output.error('TRELLO_API_KEY and TRELLO_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Fetching lists...');

        try {
          const board = await trello.findBoardByName(boardName);
          if (!board) {
            spinner.fail(`Board "${boardName}" not found`);
            return;
          }

          const lists = await trello.getLists(board.id);
          spinner.success(`${lists.length} lists in ${board.name}`);

          if (globalFlags.json) {
            output.json(lists);
            return;
          }

          if (lists.length === 0) {
            console.log(c.dim('\nNo lists found.'));
            return;
          }

          console.log('');
          for (const list of lists) {
            console.log(`${c.cyan('▪')} ${c.bold(list.name)}`);
            console.log(c.dim(`  ID: ${list.id}`));
          }
          console.log('');
        } catch (error) {
          spinner.fail('Failed to fetch lists');
          throw error;
        }
      },
    },
    {
      name: 'create',
      aliases: ['new', 'add'],
      description: 'Create a list in a board',
      args: [
        { name: 'board', description: 'Board name or ID', required: true },
        { name: 'name', description: 'List name', required: true },
      ],
      examples: ['uni trello lists create "My Project" "To Do"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const boardName = args.board as string;
        const listName = args.name as string;

        if (!trello.hasCredentials()) {
          output.error('TRELLO_API_KEY and TRELLO_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Creating list...');

        try {
          const board = await trello.findBoardByName(boardName);
          if (!board) {
            spinner.fail(`Board "${boardName}" not found`);
            return;
          }

          const list = await trello.createList(board.id, listName);
          spinner.success('List created');

          if (globalFlags.json) {
            output.json(list);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Created list: ${list.name}`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to create list');
          throw error;
        }
      },
    },
    {
      name: 'archive',
      aliases: ['close'],
      description: 'Archive a list',
      args: [
        { name: 'board', description: 'Board name or ID', required: true },
        { name: 'name', description: 'List name', required: true },
      ],
      examples: ['uni trello lists archive "My Project" "Done"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const boardName = args.board as string;
        const listName = args.name as string;

        if (!trello.hasCredentials()) {
          output.error('TRELLO_API_KEY and TRELLO_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Archiving list...');

        try {
          const board = await trello.findBoardByName(boardName);
          if (!board) {
            spinner.fail(`Board "${boardName}" not found`);
            return;
          }

          const list = await trello.findListByName(board.id, listName);
          if (!list) {
            spinner.fail(`List "${listName}" not found`);
            return;
          }

          await trello.archiveList(list.id);
          spinner.success('List archived');

          if (globalFlags.json) {
            output.json({ success: true, listId: list.id });
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Archived: ${list.name}`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to archive list');
          throw error;
        }
      },
    },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    ctx.output.error('Usage: uni trello lists <list|create|archive> <board>');
  },
};
