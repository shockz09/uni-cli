/**
 * uni telegram delete - Delete messages
 * Supports: single ID, range (10645-10649), or text search
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated } from '../client';

// Parse message ID input - returns array of IDs or null for text search
function parseMessageIds(input: string): number[] | null {
  // Check for range syntax: 10645-10649
  const rangeMatch = input.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (start > end) return null; // Invalid range
    const ids: number[] = [];
    for (let i = start; i <= end; i++) {
      ids.push(i);
    }
    return ids;
  }

  // Check for single ID
  const singleId = parseInt(input, 10);
  if (!isNaN(singleId) && String(singleId) === input) {
    return [singleId];
  }

  // Not a number - treat as text search
  return null;
}

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete messages by ID, range, or text search',
  args: [
    {
      name: 'chat',
      description: 'Chat identifier (@username, phone, ID, or title)',
      required: true,
    },
    {
      name: 'query',
      description: 'Message ID, range (10645-10649), or text to search',
      required: true,
    },
  ],
  options: [
    {
      name: 'revoke',
      short: 'r',
      type: 'boolean',
      description: 'Delete for everyone (default: true)',
      default: true,
    },
    {
      name: 'limit',
      short: 'n',
      type: 'number',
      description: 'Max messages to delete when searching by text (default: 10)',
      default: 10,
    },
  ],
  examples: [
    'uni telegram delete me 12345',
    'uni telegram delete me 10645-10649',
    'uni telegram delete me "test message"',
    'uni telegram delete @username 67890 --no-revoke',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const chat = args.chat as string;
    const query = args.query as string;
    const revoke = flags.revoke !== false;
    const limit = flags.limit as number;

    const messageIds = parseMessageIds(query);

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinner = output.spinner(messageIds ? 'Deleting message(s)...' : 'Searching messages...');

    try {
      const client = await createClient();
      if (!client) {
        spinner.fail('Failed to connect');
        return;
      }

      // Get entity
      let entity;
      try {
        entity = await client.getEntity(chat);
      } catch {
        const dialogs = await client.getDialogs({ limit: 100 });
        const found = dialogs.find(
          (d) =>
            d.title?.toLowerCase() === chat.toLowerCase() ||
            d.name?.toLowerCase() === chat.toLowerCase()
        );
        if (found) {
          entity = found.entity;
        } else {
          await client.disconnect();
          spinner.fail('Chat not found');
          output.error(`Could not find chat: ${chat}`);
          return;
        }
      }

      let idsToDelete: number[] = [];

      if (messageIds) {
        // Direct IDs or range
        idsToDelete = messageIds;
      } else {
        // Text search - find messages containing the query
        spinner.update('Searching for messages...');
        const messages = await client.getMessages(entity, { limit: 100 });

        for (const msg of messages) {
          if (msg.message?.toLowerCase().includes(query.toLowerCase())) {
            idsToDelete.push(msg.id);
            if (idsToDelete.length >= limit) break;
          }
        }

        if (idsToDelete.length === 0) {
          await client.disconnect();
          spinner.fail('No messages found');
          output.error(`No messages containing "${query}" found`);
          return;
        }

        spinner.update(`Found ${idsToDelete.length} message(s), deleting...`);
      }

      await client.deleteMessages(entity, idsToDelete, { revoke });
      await client.disconnect();

      const count = idsToDelete.length;
      spinner.success(`${count} message${count > 1 ? 's' : ''} deleted`);

      if (globalFlags.json) {
        output.json({ success: true, deleted: idsToDelete, count, revoke });
        return;
      }

      console.log('');
      console.log(c.green(`✓ ${count} message${count > 1 ? 's' : ''} deleted successfully`));
      if (count === 1) {
        console.log(c.dim(`  Message ID: ${idsToDelete[0]}`));
      } else {
        console.log(c.dim(`  Message IDs: ${idsToDelete[0]}...${idsToDelete[idsToDelete.length - 1]}`));
      }
      if (revoke) {
        console.log(c.dim('  Deleted for everyone'));
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to delete message(s)');
      throw error;
    }
  },
};
