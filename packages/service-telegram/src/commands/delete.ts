/**
 * uni telegram delete - Delete a message
 */

import type { Command, CommandContext } from '@uni/shared';
import { c } from '@uni/shared';
import { createClient, isAuthenticated } from '../client';

export const deleteCommand: Command = {
  name: 'delete',
  description: 'Delete a message',
  args: [
    {
      name: 'chat',
      description: 'Chat identifier (@username, phone, ID, or title)',
      required: true,
    },
    {
      name: 'messageId',
      description: 'Message ID to delete',
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
  ],
  examples: [
    'uni telegram delete me 12345',
    'uni telegram delete @username 67890',
    'uni telegram delete me 12345 --no-revoke',
  ],

  async handler(ctx: CommandContext): Promise<void> {
    const { output, args, flags, globalFlags } = ctx;
    const chat = args.chat as string;
    const messageId = parseInt(args.messageId as string, 10);
    const revoke = flags.revoke !== false;

    if (isNaN(messageId)) {
      output.error('Invalid message ID');
      return;
    }

    if (!isAuthenticated()) {
      output.error('Not authenticated. Run `uni telegram auth` first.');
      return;
    }

    const spinner = output.spinner('Deleting message...');

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

      await client.deleteMessages(entity, [messageId], { revoke });
      await client.disconnect();

      spinner.success('Message deleted');

      if (globalFlags.json) {
        output.json({ success: true, messageId, revoke });
        return;
      }

      console.log('');
      console.log(c.green('✓ Message deleted successfully'));
      console.log(c.dim(`  Message ID: ${messageId}`));
      if (revoke) {
        console.log(c.dim('  Deleted for everyone'));
      }
      console.log('');
    } catch (error) {
      spinner.fail('Failed to delete message');
      throw error;
    }
  },
};
