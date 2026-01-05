/**
 * uni trello boards - Manage Trello boards
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { trello } from '../api';

export const boardsCommand: Command = {
  name: 'boards',
  aliases: ['board', 'b'],
  description: 'Manage boards',
  subcommands: [
    {
      name: 'list',
      aliases: ['ls'],
      description: 'List boards',
      examples: ['uni trello boards list'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, globalFlags } = ctx;

        if (!trello.hasCredentials()) {
          output.error('TRELLO_API_KEY and TRELLO_TOKEN not set. Get them from https://trello.com/power-ups/admin');
          return;
        }

        const spinner = output.spinner('Fetching boards...');

        try {
          const boards = await trello.listBoards();
          const openBoards = boards.filter(b => !b.closed);
          spinner.success(`${openBoards.length} boards`);

          if (globalFlags.json) {
            output.json(openBoards);
            return;
          }

          if (openBoards.length === 0) {
            console.log(c.dim('\nNo boards found.'));
            return;
          }

          console.log('');
          for (const board of openBoards) {
            console.log(`${c.bold(board.name)}`);
            if (board.desc) {
              console.log(c.dim(`  ${board.desc.substring(0, 60)}${board.desc.length > 60 ? '...' : ''}`));
            }
            console.log(c.dim(`  ${board.shortUrl}`));
            console.log('');
          }
        } catch (error) {
          spinner.fail('Failed to fetch boards');
          throw error;
        }
      },
    },
    {
      name: 'create',
      aliases: ['new', 'add'],
      description: 'Create a board',
      args: [{ name: 'name', description: 'Board name', required: true }],
      options: [
        { name: 'description', short: 'd', type: 'string', description: 'Board description' },
      ],
      examples: [
        'uni trello boards create "My Project"',
        'uni trello boards create "Sprint Board" -d "Q1 Sprint planning"',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, flags, globalFlags } = ctx;
        const name = args.name as string;

        if (!trello.hasCredentials()) {
          output.error('TRELLO_API_KEY and TRELLO_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Creating board...');

        try {
          const board = await trello.createBoard(name, {
            desc: flags.description as string | undefined,
          });

          spinner.success('Board created');

          if (globalFlags.json) {
            output.json(board);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Created: ${board.name}`);
          console.log(c.dim(`  ${board.shortUrl}`));
          console.log('');
        } catch (error) {
          spinner.fail('Failed to create board');
          throw error;
        }
      },
    },
    {
      name: 'close',
      aliases: ['archive'],
      description: 'Close (archive) a board',
      args: [{ name: 'name', description: 'Board name or ID', required: true }],
      examples: ['uni trello boards close "Old Project"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const name = args.name as string;

        if (!trello.hasCredentials()) {
          output.error('TRELLO_API_KEY and TRELLO_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Closing board...');

        try {
          const board = await trello.findBoardByName(name);
          if (!board) {
            spinner.fail(`Board "${name}" not found`);
            return;
          }

          await trello.closeBoard(board.id);
          spinner.success('Board closed');

          if (globalFlags.json) {
            output.json({ success: true, boardId: board.id });
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Closed: ${board.name}`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to close board');
          throw error;
        }
      },
    },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const listCmd = this.subcommands?.find(s => s.name === 'list');
    if (listCmd) {
      await listCmd.handler(ctx);
    }
  },
};
