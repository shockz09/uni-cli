/**
 * uni trello members - List Trello board members
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { trello } from '../api';

export const membersCommand: Command = {
  name: 'members',
  aliases: ['member', 'm'],
  description: 'List board members',
  args: [{ name: 'board', description: 'Board name or ID', required: true }],
  examples: ['uni trello members "My Project"'],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, globalFlags } = ctx;
    const boardName = args.board as string;

    if (!trello.hasCredentials()) {
      output.error('TRELLO_API_KEY and TRELLO_TOKEN not set.');
      return;
    }

    const spinner = output.spinner('Fetching members...');

    try {
      const board = await trello.findBoardByName(boardName);
      if (!board) {
        spinner.fail(`Board "${boardName}" not found`);
        return;
      }

      const members = await trello.getBoardMembers(board.id);
      spinner.success(`${members.length} members`);

      if (globalFlags.json) {
        output.json(members);
        return;
      }

      if (members.length === 0) {
        console.log(c.dim('\nNo members found.'));
        return;
      }

      console.log('');
      for (const member of members) {
        console.log(`${c.cyan('@' + member.username)} ${c.bold(member.fullName)}`);
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to fetch members');
      throw error;
    }
  },
};
