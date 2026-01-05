/**
 * uni trello cards - Manage Trello cards
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { trello, type Card } from '../api';

function formatCard(card: Card): void {
  const labels = card.labels.length
    ? ' ' + card.labels.map(l => c.magenta(`[${l.name || l.color}]`)).join('')
    : '';
  const due = card.due ? c.dim(` (due: ${new Date(card.due).toLocaleDateString()})`) : '';
  const done = card.dueComplete ? c.green(' ✓') : '';

  console.log(`${c.cyan('•')} ${c.bold(card.name)}${labels}${due}${done}`);
  if (card.desc) {
    console.log(c.dim(`  ${card.desc.substring(0, 60)}${card.desc.length > 60 ? '...' : ''}`));
  }
}

export const cardsCommand: Command = {
  name: 'cards',
  aliases: ['card', 'c'],
  description: 'Manage cards',
  subcommands: [
    {
      name: 'list',
      aliases: ['ls'],
      description: 'List cards in a board or list',
      args: [{ name: 'board', description: 'Board name or ID', required: true }],
      options: [
        { name: 'list', short: 'l', type: 'string', description: 'Filter by list name' },
      ],
      examples: [
        'uni trello cards list "My Project"',
        'uni trello cards list "My Project" --list "To Do"',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, flags, globalFlags } = ctx;
        const boardName = args.board as string;
        const listName = flags.list as string | undefined;

        if (!trello.hasCredentials()) {
          output.error('TRELLO_API_KEY and TRELLO_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Fetching cards...');

        try {
          const board = await trello.findBoardByName(boardName);
          if (!board) {
            spinner.fail(`Board "${boardName}" not found`);
            return;
          }

          let listId: string | undefined;
          if (listName) {
            const list = await trello.findListByName(board.id, listName);
            if (!list) {
              spinner.fail(`List "${listName}" not found`);
              return;
            }
            listId = list.id;
          }

          const cards = await trello.getCards(board.id, listId);
          const openCards = cards.filter(c => !c.closed);
          spinner.success(`${openCards.length} cards`);

          if (globalFlags.json) {
            output.json(openCards);
            return;
          }

          if (openCards.length === 0) {
            console.log(c.dim('\nNo cards found.'));
            return;
          }

          // Group by list if not filtered
          if (!listId) {
            const lists = await trello.getLists(board.id);
            const listMap = new Map(lists.map(l => [l.id, l.name]));

            const grouped = new Map<string, Card[]>();
            for (const card of openCards) {
              const listName = listMap.get(card.idList) || 'Unknown';
              if (!grouped.has(listName)) grouped.set(listName, []);
              grouped.get(listName)!.push(card);
            }

            console.log('');
            for (const [listName, cards] of grouped) {
              console.log(c.yellow(`\n${listName}:`));
              for (const card of cards) {
                formatCard(card);
              }
            }
            console.log('');
          } else {
            console.log('');
            for (const card of openCards) {
              formatCard(card);
            }
            console.log('');
          }
        } catch (error) {
          spinner.fail('Failed to fetch cards');
          throw error;
        }
      },
    },
    {
      name: 'create',
      aliases: ['new', 'add'],
      description: 'Create a card',
      args: [
        { name: 'board', description: 'Board name or ID', required: true },
        { name: 'list', description: 'List name', required: true },
        { name: 'name', description: 'Card name', required: true },
      ],
      options: [
        { name: 'description', short: 'd', type: 'string', description: 'Card description' },
        { name: 'due', type: 'string', description: 'Due date (YYYY-MM-DD)' },
      ],
      examples: [
        'uni trello cards create "My Project" "To Do" "Fix login bug"',
        'uni trello cards create "Sprint" "Backlog" "Add dark mode" -d "Users want dark mode" --due 2026-01-15',
      ],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, flags, globalFlags } = ctx;
        const boardName = args.board as string;
        const listName = args.list as string;
        const cardName = args.name as string;

        if (!trello.hasCredentials()) {
          output.error('TRELLO_API_KEY and TRELLO_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Creating card...');

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

          const card = await trello.createCard(list.id, {
            name: cardName,
            desc: flags.description as string | undefined,
            due: flags.due as string | undefined,
          });

          spinner.success('Card created');

          if (globalFlags.json) {
            output.json(card);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Created: ${card.name}`);
          console.log(c.dim(`  ${card.shortUrl}`));
          console.log('');
        } catch (error) {
          spinner.fail('Failed to create card');
          throw error;
        }
      },
    },
    {
      name: 'move',
      description: 'Move a card to another list',
      args: [
        { name: 'board', description: 'Board name or ID', required: true },
        { name: 'card', description: 'Card name (partial match)', required: true },
        { name: 'list', description: 'Destination list name', required: true },
      ],
      examples: ['uni trello cards move "My Project" "Fix bug" "Done"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const boardName = args.board as string;
        const cardName = args.card as string;
        const listName = args.list as string;

        if (!trello.hasCredentials()) {
          output.error('TRELLO_API_KEY and TRELLO_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Moving card...');

        try {
          const board = await trello.findBoardByName(boardName);
          if (!board) {
            spinner.fail(`Board "${boardName}" not found`);
            return;
          }

          const card = await trello.findCardByName(board.id, cardName);
          if (!card) {
            spinner.fail(`Card "${cardName}" not found`);
            return;
          }

          const list = await trello.findListByName(board.id, listName);
          if (!list) {
            spinner.fail(`List "${listName}" not found`);
            return;
          }

          const updated = await trello.updateCard(card.id, { idList: list.id });
          spinner.success('Card moved');

          if (globalFlags.json) {
            output.json(updated);
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Moved "${card.name}" to ${list.name}`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to move card');
          throw error;
        }
      },
    },
    {
      name: 'archive',
      aliases: ['close'],
      description: 'Archive a card',
      args: [
        { name: 'board', description: 'Board name or ID', required: true },
        { name: 'card', description: 'Card name (partial match)', required: true },
      ],
      examples: ['uni trello cards archive "My Project" "Old task"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const boardName = args.board as string;
        const cardName = args.card as string;

        if (!trello.hasCredentials()) {
          output.error('TRELLO_API_KEY and TRELLO_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Archiving card...');

        try {
          const board = await trello.findBoardByName(boardName);
          if (!board) {
            spinner.fail(`Board "${boardName}" not found`);
            return;
          }

          const card = await trello.findCardByName(board.id, cardName);
          if (!card) {
            spinner.fail(`Card "${cardName}" not found`);
            return;
          }

          await trello.archiveCard(card.id);
          spinner.success('Card archived');

          if (globalFlags.json) {
            output.json({ success: true, cardId: card.id });
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Archived: ${card.name}`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to archive card');
          throw error;
        }
      },
    },
    {
      name: 'delete',
      aliases: ['rm', 'remove'],
      description: 'Delete a card permanently',
      args: [
        { name: 'board', description: 'Board name or ID', required: true },
        { name: 'card', description: 'Card name (partial match)', required: true },
      ],
      examples: ['uni trello cards delete "My Project" "Test card"'],
      async handler(ctx: CommandContext): Promise<void> {
        const { output, args, globalFlags } = ctx;
        const boardName = args.board as string;
        const cardName = args.card as string;

        if (!trello.hasCredentials()) {
          output.error('TRELLO_API_KEY and TRELLO_TOKEN not set.');
          return;
        }

        const spinner = output.spinner('Deleting card...');

        try {
          const board = await trello.findBoardByName(boardName);
          if (!board) {
            spinner.fail(`Board "${boardName}" not found`);
            return;
          }

          const card = await trello.findCardByName(board.id, cardName);
          if (!card) {
            spinner.fail(`Card "${cardName}" not found`);
            return;
          }

          await trello.deleteCard(card.id);
          spinner.success('Card deleted');

          if (globalFlags.json) {
            output.json({ success: true, cardId: card.id });
            return;
          }

          console.log('');
          console.log(c.green('✓') + ` Deleted: ${card.name}`);
          console.log('');
        } catch (error) {
          spinner.fail('Failed to delete card');
          throw error;
        }
      },
    },
  ],

  async handler(ctx: CommandContext): Promise<void> {
    ctx.output.error('Usage: uni trello cards <list|create|move|archive|delete> <board>');
  },
};
